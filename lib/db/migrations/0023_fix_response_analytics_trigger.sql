-- Fix trigger to handle DELETE events by using OLD.messageId
CREATE OR REPLACE FUNCTION update_response_analytics() RETURNS TRIGGER AS $$
DECLARE target_message_id UUID;
BEGIN target_message_id := COALESCE(NEW."messageId", OLD."messageId");
INSERT INTO "ResponseAnalytics" (
        "messageId",
        "model",
        "totalVotes",
        "upvotes",
        "downvotes",
        "averageQualityScore"
    )
SELECT target_message_id,
    'unknown',
    COUNT(*),
    COUNT(*) FILTER (
        WHERE "voteType" = 'up'
    ),
    COUNT(*) FILTER (
        WHERE "voteType" = 'down'
    ),
    AVG("qualityScore")
FROM "ResponseFeedback"
WHERE "messageId" = target_message_id ON CONFLICT ("messageId") DO
UPDATE
SET "totalVotes" = EXCLUDED."totalVotes",
    "upvotes" = EXCLUDED."upvotes",
    "downvotes" = EXCLUDED."downvotes",
    "averageQualityScore" = EXCLUDED."averageQualityScore";
RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
-- Recreate trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS trigger_update_response_analytics ON "ResponseFeedback";
CREATE TRIGGER trigger_update_response_analytics
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON "ResponseFeedback" FOR EACH ROW EXECUTE FUNCTION update_response_analytics();