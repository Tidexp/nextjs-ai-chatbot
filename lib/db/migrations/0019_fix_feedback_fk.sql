-- Fix foreign keys to reference Message_v2 instead of deprecated Message
-- ResponseFeedback.messageId -> Message_v2(id)
ALTER TABLE "ResponseFeedback" DROP CONSTRAINT IF EXISTS "ResponseFeedback_messageId_fkey";
ALTER TABLE "ResponseFeedback"
ADD CONSTRAINT "ResponseFeedback_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message_v2"("id") ON DELETE CASCADE;
-- ResponseAnalytics.messageId -> Message_v2(id)
ALTER TABLE "ResponseAnalytics" DROP CONSTRAINT IF EXISTS "ResponseAnalytics_messageId_fkey";
ALTER TABLE "ResponseAnalytics"
ADD CONSTRAINT "ResponseAnalytics_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message_v2"("id") ON DELETE CASCADE;