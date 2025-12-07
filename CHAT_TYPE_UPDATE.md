# Chat Type Differentiation Update

## Overview

Added `chat_type` field to distinguish between different types of chats in the database:

- **general**: Regular chat conversations
- **lesson**: Topic/lesson-based learning chats
- **instructor**: Instructor mode chats with source integration

## Database Changes

### Schema Updates (`lib/db/schema.ts`)

- Added `chatTypeEnum` with values: `'general'`, `'lesson'`, `'instructor'`
- Added `chatType` column to `Chat` table with default value `'general'`

### Migration Script (`lib/db/migrations/0001_add_chat_type.sql`)

Execute this SQL in your Neon console:

```sql
-- Create the chat_type enum
DO $$ BEGIN
  CREATE TYPE chat_type AS ENUM ('general', 'lesson', 'instructor');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add chat_type column
ALTER TABLE "Chat"
ADD COLUMN IF NOT EXISTS "chat_type" chat_type NOT NULL DEFAULT 'general';

-- Update existing lesson chats
UPDATE "Chat"
SET "chat_type" = 'lesson'
WHERE "lessonId" IS NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_chat_type" ON "Chat"("chat_type");
CREATE INDEX IF NOT EXISTS "idx_chat_user_type" ON "Chat"("userId", "chat_type");
```

## Code Changes

### 1. Database Queries (`lib/db/queries.ts`)

- Updated `saveChat()` function to accept optional `chatType` parameter
- Automatically determines `chatType` as `'lesson'` if `lessonId` is provided
- Falls back to `'general'` if not specified

### 2. API Schema (`app/(chat)/api/chat/schema.ts`)

- Added optional `chatType` field to `postRequestBodySchema`
- Accepts: `'general'`, `'lesson'`, or `'instructor'`

### 3. Chat API Route (`app/(chat)/api/chat/route.ts`)

- When creating new chat, passes `chatType` from request body to `saveChat()`
- Sets title to "Instructor Chat" for instructor mode

### 4. Instructor Chat Component (`components/instructor-chat.tsx`)

- Creates persistent `instructorChatId` per session using `useMemo`
- Sends `chatType: 'instructor'` in API requests
- All instructor chat messages are now properly tagged in the database

## Benefits

1. **Clear Separation**: Each chat type is now identifiable in the database
2. **Better Querying**: Can filter chats by type for analytics or history
3. **Future Features**: Enables type-specific features like:
   - Separate chat history views
   - Type-specific settings
   - Analytics per chat type
4. **Automatic Classification**: Lesson chats are auto-tagged when `lessonId` is present

## Testing

After running the migration:

1. Create a new general chat - should have `chat_type = 'general'`
2. Enter instructor mode and chat - should have `chat_type = 'instructor'`
3. Start a lesson chat - should have `chat_type = 'lesson'`

Query to verify:

```sql
SELECT id, title, "chat_type", "lessonId", "createdAt"
FROM "Chat"
ORDER BY "createdAt" DESC
LIMIT 10;
```
