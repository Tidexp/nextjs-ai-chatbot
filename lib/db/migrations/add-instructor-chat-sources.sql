-- Migration: Add instructor chat sources junction table
-- This migration creates a junction table to link instructor chats with their source materials
-- Create InstructorChatSource junction table
CREATE TABLE IF NOT EXISTS "InstructorChatSource" (
    "chatId" UUID NOT NULL REFERENCES "Chat"("id") ON DELETE CASCADE,
    "sourceId" UUID NOT NULL REFERENCES "InstructorSource"("id") ON DELETE CASCADE,
    "addedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("chatId", "sourceId")
);
-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_instructor_chat_source_chat" ON "InstructorChatSource"("chatId");
CREATE INDEX IF NOT EXISTS "idx_instructor_chat_source_source" ON "InstructorChatSource"("sourceId");
CREATE INDEX IF NOT EXISTS "idx_instructor_chat_source_added" ON "InstructorChatSource"("addedAt" DESC);
-- Add comment to describe the table
COMMENT ON TABLE "InstructorChatSource" IS 'Junction table linking instructor chats with their associated source materials';
COMMENT ON COLUMN "InstructorChatSource"."chatId" IS 'Reference to the instructor chat';
COMMENT ON COLUMN "InstructorChatSource"."sourceId" IS 'Reference to the instructor source material';
COMMENT ON COLUMN "InstructorChatSource"."addedAt" IS 'Timestamp when the source was added to the chat';