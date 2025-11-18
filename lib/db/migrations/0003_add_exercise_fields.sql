-- Add exercise fields to TopicLesson table
ALTER TABLE "TopicLesson"
ADD COLUMN IF NOT EXISTS "starterCode" TEXT,
    ADD COLUMN IF NOT EXISTS "language" VARCHAR(32),
    ADD COLUMN IF NOT EXISTS "tests" JSONB;
-- Update lesson type enum to include new types
ALTER TABLE "TopicLesson" DROP CONSTRAINT IF EXISTS "TopicLesson_type_check";
ALTER TABLE "TopicLesson"
ADD CONSTRAINT "TopicLesson_type_check" CHECK (
        "type" IN (
            'theory',
            'introduction',
            'exercise',
            'practice',
            'project',
            'quiz'
        )
    );