-- Add module completion tracking
ALTER TABLE "TopicModule"
ADD COLUMN difficulty varchar(32) DEFAULT 'Beginner',
    ADD COLUMN estimated_hours integer DEFAULT 2;
-- Add lesson completion tracking
CREATE TABLE "LessonProgress" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES "User"(id),
    lesson_id uuid NOT NULL REFERENCES "TopicLesson"(id),
    completed_at timestamp,
    last_accessed_at timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_lesson UNIQUE(user_id, lesson_id)
);
-- Add module completion tracking
CREATE TABLE "ModuleProgress" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES "User"(id),
    module_id uuid NOT NULL REFERENCES "TopicModule"(id),
    completed_at timestamp,
    last_accessed_at timestamp NOT NULL DEFAULT NOW(),
    completion_percentage integer NOT NULL DEFAULT 0,
    CONSTRAINT unique_user_module UNIQUE(user_id, module_id)
);
-- Add indexes for performance
CREATE INDEX idx_lesson_progress_user ON "LessonProgress"(user_id);
CREATE INDEX idx_lesson_progress_lesson ON "LessonProgress"(lesson_id);
CREATE INDEX idx_module_progress_user ON "ModuleProgress"(user_id);
CREATE INDEX idx_module_progress_module ON "ModuleProgress"(module_id);