-- Enhanced feedback system migration
-- This migration adds comprehensive feedback collection and user preference learning
-- Add timestamps to existing vote table
ALTER TABLE "Vote_v2"
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();
-- Create enhanced response feedback table
CREATE TABLE IF NOT EXISTS "ResponseFeedback" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "chatId" UUID NOT NULL REFERENCES "Chat"("id") ON DELETE CASCADE,
    "messageId" UUID NOT NULL REFERENCES "Message_v2"("id") ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "voteType" TEXT NOT NULL CHECK ("voteType" IN ('up', 'down', 'neutral')),
    "qualityScore" INTEGER CHECK (
        "qualityScore" >= 1
        AND "qualityScore" <= 10
    ),
    "helpfulnessScore" INTEGER CHECK (
        "helpfulnessScore" >= 1
        AND "helpfulnessScore" <= 10
    ),
    "accuracyScore" INTEGER CHECK (
        "accuracyScore" >= 1
        AND "accuracyScore" <= 10
    ),
    "clarityScore" INTEGER CHECK (
        "clarityScore" >= 1
        AND "clarityScore" <= 10
    ),
    "downvoteReason" TEXT CHECK (
        "downvoteReason" IN (
            'inaccurate',
            'unhelpful',
            'inappropriate',
            'too_long',
            'too_short',
            'off_topic',
            'other'
        )
    ),
    "customFeedback" TEXT,
    "responseTime" INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "unique_user_message_feedback" UNIQUE ("userId", "messageId")
);
-- Create user preferences table
CREATE TABLE IF NOT EXISTS "UserPreferences" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "preferenceType" TEXT NOT NULL CHECK (
        "preferenceType" IN (
            'response_style',
            'detail_level',
            'tone',
            'format',
            'topic_expertise'
        )
    ),
    "preferenceValue" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 0.5 CHECK (
        "confidence" >= 0
        AND "confidence" <= 1
    ),
    "evidenceCount" INTEGER NOT NULL DEFAULT 1,
    "lastUpdated" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "unique_user_preference" UNIQUE ("userId", "preferenceType", "preferenceValue")
);
-- Create response analytics table
CREATE TABLE IF NOT EXISTS "ResponseAnalytics" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "messageId" UUID NOT NULL REFERENCES "Message_v2"("id") ON DELETE CASCADE,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "responseTime" INTEGER,
    "averageQualityScore" REAL,
    "totalVotes" INTEGER NOT NULL DEFAULT 0,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
-- Create indexes for better performance
CREATE INDEX "idx_response_feedback_user_id" ON "ResponseFeedback"("userId");
CREATE INDEX "idx_response_feedback_message_id" ON "ResponseFeedback"("messageId");
CREATE INDEX "idx_response_feedback_created_at" ON "ResponseFeedback"("createdAt");
CREATE INDEX "idx_user_preferences_user_id" ON "UserPreferences"("userId");
CREATE INDEX "idx_user_preferences_type" ON "UserPreferences"("preferenceType");
CREATE INDEX "idx_user_preferences_confidence" ON "UserPreferences"("confidence");
CREATE UNIQUE INDEX IF NOT EXISTS "ux_response_analytics_message_id" ON "ResponseAnalytics"("messageId");
CREATE INDEX IF NOT EXISTS "idx_response_analytics_message_id" ON "ResponseAnalytics"("messageId");
CREATE INDEX "idx_response_analytics_model" ON "ResponseAnalytics"("model");
CREATE INDEX "idx_response_analytics_created_at" ON "ResponseAnalytics"("createdAt");
CREATE INDEX "idx_response_analytics_quality_score" ON "ResponseAnalytics"("averageQualityScore");
-- Create a function to automatically update response analytics when feedback is added
CREATE OR REPLACE FUNCTION update_response_analytics() RETURNS TRIGGER AS $$ BEGIN -- Update or insert analytics for the message
INSERT INTO "ResponseAnalytics" (
        "messageId",
        "model",
        "totalVotes",
        "upvotes",
        "downvotes",
        "averageQualityScore"
    )
SELECT NEW."messageId",
    'unknown',
    -- TODO: populate with actual model when available
    COUNT(*),
    COUNT(*) FILTER (
        WHERE "voteType" = 'up'
    ),
    COUNT(*) FILTER (
        WHERE "voteType" = 'down'
    ),
    AVG("qualityScore")
FROM "ResponseFeedback"
WHERE "messageId" = NEW."messageId" ON CONFLICT ("messageId") DO
UPDATE
SET "totalVotes" = EXCLUDED."totalVotes",
    "upvotes" = EXCLUDED."upvotes",
    "downvotes" = EXCLUDED."downvotes",
    "averageQualityScore" = EXCLUDED."averageQualityScore";
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create trigger to automatically update analytics
DROP TRIGGER IF EXISTS trigger_update_response_analytics ON "ResponseFeedback";
CREATE TRIGGER trigger_update_response_analytics
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON "ResponseFeedback" FOR EACH ROW EXECUTE FUNCTION update_response_analytics();