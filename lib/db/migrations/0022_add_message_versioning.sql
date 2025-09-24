-- Add versioning support to Message_v2
ALTER TABLE "Message_v2"
ADD COLUMN IF NOT EXISTS "parentMessageId" UUID NULL REFERENCES "Message_v2"("id") ON DELETE
SET NULL,
    ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "supersededAt" TIMESTAMP NULL;
CREATE INDEX IF NOT EXISTS "idx_message_v2_parent" ON "Message_v2"("parentMessageId");
CREATE INDEX IF NOT EXISTS "idx_message_v2_active" ON "Message_v2"("isActive");