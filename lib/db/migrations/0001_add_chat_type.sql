-- Migration: Add chat_type column to distinguish different types of chats
-- Created: 2025-12-02
-- Create the chat_type enum
DO $$ BEGIN CREATE TYPE chat_type AS ENUM ('general', 'lesson', 'instructor');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
-- Add chat_type column to Chat table with default value 'general'
ALTER TABLE "Chat"
ADD COLUMN IF NOT EXISTS "chat_type" chat_type NOT NULL DEFAULT 'general';
-- Update existing lesson chats to have type 'lesson'
UPDATE "Chat"
SET "chat_type" = 'lesson'
WHERE "lessonId" IS NOT NULL;
-- Create index for better query performance
CREATE INDEX IF NOT EXISTS "idx_chat_type" ON "Chat"("chat_type");
CREATE INDEX IF NOT EXISTS "idx_chat_user_type" ON "Chat"("userId", "chat_type");
-- Add comment for documentation
COMMENT ON COLUMN "Chat"."chat_type" IS 'Type of chat: general (normal chat), lesson (topic/lesson chat), instructor (instructor mode chat with sources)';