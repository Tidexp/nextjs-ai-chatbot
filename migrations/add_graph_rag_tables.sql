-- Graph RAG Tables Migration
-- Run this in your PostgreSQL database to add entity and relation storage
-- Graph entities (extracted from document chunks)
CREATE TABLE IF NOT EXISTS "GraphEntity" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "sourceId" UUID NOT NULL REFERENCES "InstructorSource"(id) ON DELETE CASCADE,
    "chunkId" UUID REFERENCES "DocumentChunk"(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    type VARCHAR(64) NOT NULL DEFAULT 'entity',
    "canonicalLabel" TEXT,
    metadata JSON,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_entity_per_source_label UNIQUE ("sourceId", label, type)
);
-- Graph relations (connections between entities)
CREATE TABLE IF NOT EXISTS "GraphRelation" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "sourceId" UUID NOT NULL REFERENCES "InstructorSource"(id) ON DELETE CASCADE,
    "fromEntityId" UUID NOT NULL REFERENCES "GraphEntity"(id) ON DELETE CASCADE,
    "toEntityId" UUID NOT NULL REFERENCES "GraphEntity"(id) ON DELETE CASCADE,
    "relationType" VARCHAR(64) NOT NULL DEFAULT 'co_occurs',
    "evidenceChunkId" UUID REFERENCES "DocumentChunk"(id) ON DELETE
    SET NULL,
        weight REAL DEFAULT 1,
        metadata JSON,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT unique_relation UNIQUE (
            "sourceId",
            "fromEntityId",
            "toEntityId",
            "relationType"
        )
);
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_graphentity_source_label ON "GraphEntity" ("sourceId", lower(label));
CREATE INDEX IF NOT EXISTS idx_graphentity_canonical ON "GraphEntity" ("sourceId", "canonicalLabel");
CREATE INDEX IF NOT EXISTS idx_graphrelation_source_entities ON "GraphRelation" ("sourceId", "fromEntityId", "toEntityId");
CREATE INDEX IF NOT EXISTS idx_graphrelation_evidence ON "GraphRelation" ("evidenceChunkId")
WHERE "evidenceChunkId" IS NOT NULL;
-- Verify tables created
SELECT 'GraphEntity table created' as status
WHERE EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'GraphEntity'
    );
SELECT 'GraphRelation table created' as status
WHERE EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'GraphRelation'
    );