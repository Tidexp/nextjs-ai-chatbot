-- Recreate FKs with explicit names pointing to Message_v2
-- ResponseFeedback.messageId -> Message_v2(id)
ALTER TABLE "ResponseFeedback" DROP CONSTRAINT IF EXISTS "ResponseFeedback_messageId_fkey";
ALTER TABLE "ResponseFeedback" DROP CONSTRAINT IF EXISTS "fk_responsefeedback_messageid_v2";
ALTER TABLE "ResponseFeedback"
ADD CONSTRAINT "fk_responsefeedback_messageid_v2" FOREIGN KEY ("messageId") REFERENCES "Message_v2"("id") ON DELETE CASCADE;
-- ResponseAnalytics.messageId -> Message_v2(id)
ALTER TABLE "ResponseAnalytics" DROP CONSTRAINT IF EXISTS "ResponseAnalytics_messageId_fkey";
ALTER TABLE "ResponseAnalytics" DROP CONSTRAINT IF EXISTS "fk_responseanalytics_messageid_v2";
ALTER TABLE "ResponseAnalytics"
ADD CONSTRAINT "fk_responseanalytics_messageid_v2" FOREIGN KEY ("messageId") REFERENCES "Message_v2"("id") ON DELETE CASCADE;