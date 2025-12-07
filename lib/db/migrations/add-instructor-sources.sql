-- Create instructor sources table
CREATE TABLE IF NOT EXISTS "InstructorSource" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "title" VARCHAR(255) NOT NULL,
    "type" VARCHAR(32) NOT NULL CHECK ("type" IN ('markdown', 'code', 'pdf', 'image')),
    "excerpt" TEXT,
    "content" TEXT,
    "sourceUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
-- Create index for faster user queries
CREATE INDEX IF NOT EXISTS "idx_instructor_source_user" ON "InstructorSource"("userId");
-- Create index for created date
CREATE INDEX IF NOT EXISTS "idx_instructor_source_created" ON "InstructorSource"("createdAt" DESC);
-- Create document chunks table for RAG embeddings
CREATE TABLE IF NOT EXISTS "DocumentChunk" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "sourceId" UUID NOT NULL REFERENCES "InstructorSource"("id") ON DELETE CASCADE,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
-- Create index for faster source queries
CREATE INDEX IF NOT EXISTS "idx_document_chunk_source" ON "DocumentChunk"("sourceId");
-- Create index for chunk ordering
CREATE INDEX IF NOT EXISTS "idx_document_chunk_index" ON "DocumentChunk"("sourceId", "chunkIndex");