/**
 * RAG Database Operations
 * Store and retrieve document chunks with embeddings
 */

import 'server-only';

import { and, eq, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { documentChunk, graphEntity, graphRelation } from '@/lib/db/schema';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/**
 * Store chunks with embeddings for a source
 */
export async function storeDocumentChunks(
  sourceId: string,
  chunks: Array<{
    content: string;
    embedding: number[];
    tokenCount: number;
    metadata?: Record<string, any>;
  }>,
): Promise<void> {
  const chunkRecords = chunks.map((chunk, index) => ({
    sourceId,
    chunkIndex: index,
    content: chunk.content,
    embedding: JSON.stringify(chunk.embedding), // Store as JSON string
    tokenCount: chunk.tokenCount,
    metadata: chunk.metadata || null,
  }));

  // Insert in batches to avoid query size limits
  const BATCH_SIZE = 50;
  for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
    const batch = chunkRecords.slice(i, i + BATCH_SIZE);
    await db.insert(documentChunk).values(batch as any);
  }

  console.log(`Stored ${chunkRecords.length} chunks for source ${sourceId}`);
}

/**
 * Get all chunks for a source
 */
export async function getSourceChunks(sourceId: string) {
  return await db
    .select()
    .from(documentChunk)
    .where(eq(documentChunk.sourceId, sourceId));
}

/**
 * Parse stored embeddings (convert from JSON string back to array)
 */
export function parseEmbedding(embeddingJson: string): number[] {
  try {
    return JSON.parse(embeddingJson);
  } catch {
    console.error('Failed to parse embedding:', embeddingJson);
    return [];
  }
}

/**
 * Get chunks with parsed embeddings
 */
export async function getSourceChunksWithEmbeddings(
  sourceId: string,
): Promise<Array<{ content: string; embedding: number[]; index: number }>> {
  const chunks = await getSourceChunks(sourceId);

  return chunks.map((chunk: any) => ({
    content: chunk.content,
    embedding: parseEmbedding(chunk.embedding),
    index: chunk.chunkIndex,
  }));
}

/**
 * Delete all chunks for a source (when source is deleted)
 */
export async function deleteSourceChunks(sourceId: string): Promise<void> {
  await db.delete(documentChunk).where(eq(documentChunk.sourceId, sourceId));
  console.log(`Deleted chunks for source ${sourceId}`);
}

/**
 * Get chunks from multiple sources
 */
export async function getChunksFromSources(sourceIds: string[]): Promise<
  Array<{
    content: string;
    embedding: number[];
    index: number;
    sourceId: string;
  }>
> {
  if (sourceIds.length === 0) return [];

  const chunks = await db
    .select()
    .from(documentChunk)
    .where(inArray(documentChunk.sourceId, sourceIds));

  return chunks.map((chunk: any) => ({
    content: chunk.content,
    embedding: parseEmbedding(chunk.embedding),
    index: chunk.chunkIndex,
    sourceId: chunk.sourceId,
  }));
}

// --- Graph RAG helpers (entity + relation storage in PostgreSQL) ---

export type GraphEntityInput = {
  label: string;
  type?: string;
  canonicalLabel?: string;
  metadata?: Record<string, any>;
};

/**
 * Get semantic weight multiplier based on relationship type.
 * Domain-specific weights for Programming and Education contexts.
 */
function getSemanticWeight(relationType: string): number {
  const weights: Record<string, number> = {
    // --- Domain: Code Structure (Programming) ---
    defines: 3.5, // Definition relationships (class/function definitions)
    implements: 3.0, // Implementation of interfaces/contracts
    extends: 3.0, // Inheritance relationships
    imports: 1.8, // File/module dependencies

    // --- Domain: Pedagogy (Educational Logic) ---
    prerequisite_of: 3.5, // Prerequisites are critical for learning paths
    explains: 3.0, // Explanatory relationships between concepts
    follows: 2.5, // Sequential order in curriculum

    // --- General ---
    contains: 2.5,
    references: 2.0,
    uses: 1.5,
    relates_to: 1.2,
    co_occurs: 1.0, // Default co-occurrence
  };
  return weights[relationType] || 1.0;
}

/**
 * Get source reliability score based on source type and metadata.
 * Adjusted for educational and technical documentation quality.
 */
function getSourceReliability(sourceMetadata?: Record<string, any>): number {
  if (!sourceMetadata) return 1.0;

  const sourceType = sourceMetadata.sourceType ?? 'other';
  const isVerified = sourceMetadata.isVerified ?? false;
  const trustScore = sourceMetadata.trustScore ?? 0;

  // Base reliability by source type
  let baseReliability = 1.0;
  if (sourceType === 'official') baseReliability = 1.4;
  else if (sourceType === 'instructor') baseReliability = 1.3;
  else if (sourceType === 'tutorial') baseReliability = 1.0;
  else if (sourceType === 'ai_generated') baseReliability = 0.8;
  else if (sourceType === 'unverified') baseReliability = 0.6;

  // Verification boost
  if (isVerified) baseReliability *= 1.1;

  // Trust score adjustment (0-100 → 0.5-1.5 multiplier)
  if (trustScore > 0) {
    const trustMultiplier = 0.5 + trustScore / 100;
    baseReliability *= trustMultiplier;
  }

  return Math.max(0.5, Math.min(1.5, baseReliability));
}

/**
 * Calculate temporal decay at read-time.
 * DO NOT use during insertion - only for retrieval scoring.
 */
function getTemporalDecay(createdAt: Date | string, decayRate = 0.01): number {
  const created =
    typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const now = new Date();
  const daysOld = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

  const decayedWeight = Math.exp(-decayRate * Math.max(0, daysOld));
  return Math.max(0.3, decayedWeight);
}

/**
 * Calculate versioning boost for content freshness.
 */
function getVersioningBoost(version?: number, isLatest?: boolean): number {
  if (isLatest) return 1.2;
  if (version !== undefined && version > 0) {
    return Math.max(0.6, 1.0 / (1 + version * 0.1));
  }
  return 1.0;
}

// Type definition for directed triplets
export type DirectedTriplet = {
  subject: string; // Entity label (e.g., "Python", "Lesson 1")
  predicate: string; // Relationship type (e.g., "implements", "prerequisite_of")
  object: string; // Target entity label (e.g., "Iterator", "Lesson 2")
};

/**
 * Store entities and directed relationships using triplets (subject, predicate, object).
 * Refactored for READ-TIME dynamic scoring:
 * - NO temporal decay at insertion (calculated at query time)
 * - Stores baseWeight = semantic × reliability × versioning (without temporal)
 * - Accepts directed triplets instead of generating random pairs
 * - Ensures createdAt timestamp is stored for later decay calculation
 */
export async function storeGraphEntitiesAndRelations(options: {
  sourceId: string;
  chunkId?: string;
  entities: GraphEntityInput[];
  triplets?: DirectedTriplet[]; // Directed relationships
  sourceMetadata?: Record<string, any>;
  version?: number;
  isLatestVersion?: boolean;
}): Promise<{ entityIds: string[]; relationCount: number }> {
  const {
    sourceId,
    chunkId,
    entities,
    triplets = [],
    sourceMetadata,
    version,
    isLatestVersion,
  } = options;

  // Deduplicate entities
  const dedupedEntities = Array.from(
    new Map(
      entities
        .filter((entity) => entity.label?.trim())
        .map((entity) => {
          const label = entity.label.trim();
          const type = (entity.type || 'entity').toLowerCase();
          const key = `${label.toLowerCase()}|${type}`;
          return [
            key,
            {
              label,
              type,
              canonicalLabel: entity.canonicalLabel || label.toLowerCase(),
              metadata: entity.metadata || null,
            },
          ];
        }),
    ).values(),
  );

  if (dedupedEntities.length === 0) {
    return { entityIds: [], relationCount: 0 };
  }

  // Insert entities
  const entityRows = dedupedEntities.map((entity) => ({
    sourceId,
    chunkId: chunkId || null,
    label: entity.label,
    type: entity.type,
    canonicalLabel: entity.canonicalLabel,
    metadata: entity.metadata,
  }));

  await db.insert(graphEntity).values(entityRows).onConflictDoNothing();

  // Fetch inserted entities
  const labels = entityRows.map((row) => row.label);
  const entitiesInDb = await db
    .select()
    .from(graphEntity)
    .where(
      and(
        eq(graphEntity.sourceId, sourceId),
        inArray(graphEntity.label, labels),
      ),
    );

  // Build entity label -> id map
  const entityMap = new Map<string, string>();
  for (const entity of entitiesInDb) {
    entityMap.set((entity as any).label, (entity as any).id);
  }

  // Process directed triplets
  const relationRows: Array<{
    sourceId: string;
    fromEntityId: string;
    toEntityId: string;
    relationType: string;
    evidenceChunkId: string | null;
    weight: number;
  }> = [];

  for (const triplet of triplets) {
    const subjectId = entityMap.get(triplet.subject);
    const objectId = entityMap.get(triplet.object);

    if (!subjectId || !objectId || subjectId === objectId) continue;

    // Calculate baseWeight WITHOUT temporal decay (store for read-time calculation)
    const semanticWeight = getSemanticWeight(triplet.predicate);
    const sourceReliability = getSourceReliability(sourceMetadata);
    const versioningBoost = getVersioningBoost(version, isLatestVersion);

    const baseWeight = semanticWeight * sourceReliability * versioningBoost;

    relationRows.push({
      sourceId,
      fromEntityId: subjectId,
      toEntityId: objectId,
      relationType: triplet.predicate,
      evidenceChunkId: chunkId || null,
      weight: baseWeight,
    });
  }

  // Upsert relations with WEIGHT SATURATION CAP (prevents inflation)
  if (relationRows.length > 0) {
    const BATCH_SIZE = 50;
    for (let i = 0; i < relationRows.length; i += BATCH_SIZE) {
      const batch = relationRows.slice(i, i + BATCH_SIZE);
      await db
        .insert(graphRelation)
        .values(batch)
        .onConflictDoUpdate({
          target: [
            graphRelation.sourceId,
            graphRelation.fromEntityId,
            graphRelation.toEntityId,
            graphRelation.relationType,
          ],
          set: {
            // Saturation cap: GREATEST(current, new) + LEAST(current, new) * 0.1
            // This rewards multiple mentions but with sharply diminishing returns
            weight: sql`GREATEST(${graphRelation.weight}, EXCLUDED.weight) + (LEAST(${graphRelation.weight}, EXCLUDED.weight) * 0.1)`,
          },
        });
    }
  }

  return {
    entityIds: Array.from(entityMap.values()),
    relationCount: relationRows.length,
  };
}

/**
 * OPTIMIZED: Find chunks with BIDIRECTIONAL CTE, Density Normalization & 2-Hop Context.
 *
 * Performance: Single SQL query replaces 5+ sequential round-trips (N+1 elimination)
 * Bidirectional: Searches both fromEntityId AND toEntityId for complete context
 * Normalization: Divides score by log(relation_count) to prevent dense chunk dominance
 * 2-Hop: Optional recursive parent context (e.g., method → class → module)
 *
 * @param options.sourceIds - Sources to search within
 * @param options.entityLabels - Query entities to match
 * @param options.temporalDecayRate - Exponential decay rate (default 0.01)
 * @param options.enableTwoHop - Enable 2-hop recursive search (default false)
 */
export async function getChunksByEntities(options: {
  sourceIds: string[];
  entityLabels: string[];
  temporalDecayRate?: number;
  enableTwoHop?: boolean;
}): Promise<
  Array<{
    chunkId: string;
    content: string;
    matchedEntities: string[];
    relatedEntities: string[];
    graphScore: number;
    relationCount: number; // For debugging density
  }>
> {
  const {
    sourceIds,
    entityLabels,
    temporalDecayRate = 0.01,
    enableTwoHop = false,
  } = options;

  if (sourceIds.length === 0 || entityLabels.length === 0) {
    return [];
  }

  const lowerLabels = entityLabels.map((label) => label.toLowerCase());

  // Unified CTE query: Match entities → Bidirectional relations → Related entities → Chunks → Scoring
  const results = await db.execute<{
    chunk_id: string;
    content: string;
    matched_entities: string;
    related_entities: string;
    graph_score: number;
    relation_count: number;
  }>(sql`
    WITH 
    -- Step 1: Match entities from query
    matched_entities AS (
      SELECT id, label, chunk_id, source_id
      FROM "GraphEntity"
      WHERE source_id = ANY(${sourceIds})
        AND canonical_label = ANY(${lowerLabels})
    ),
    
    -- Step 2: BIDIRECTIONAL relations (both directions)
    bidirectional_relations AS (
      SELECT 
        r.id,
        r.from_entity_id,
        r.to_entity_id,
        r.relation_type,
        r.weight,
        r.created_at,
        CASE 
          WHEN r.from_entity_id IN (SELECT id FROM matched_entities) THEN r.to_entity_id
          ELSE r.from_entity_id
        END AS related_entity_id
      FROM "GraphRelation" r
      WHERE r.source_id = ANY(${sourceIds})
        AND (
          r.from_entity_id IN (SELECT id FROM matched_entities)
          OR r.to_entity_id IN (SELECT id FROM matched_entities)
        )
    ),
    
    -- Step 3 (Optional): 2-hop expansion for parent context
    two_hop_relations AS (
      ${
        enableTwoHop
          ? sql`
      SELECT 
        r2.id,
        r2.from_entity_id,
        r2.to_entity_id,
        r2.relation_type,
        r2.weight * 0.5 AS weight,  -- Decay weight for 2-hop
        r2.created_at,
        CASE 
          WHEN r2.from_entity_id IN (SELECT related_entity_id FROM bidirectional_relations) THEN r2.to_entity_id
          ELSE r2.from_entity_id
        END AS related_entity_id
      FROM "GraphRelation" r2
      WHERE r2.source_id = ANY(${sourceIds})
        AND (
          r2.from_entity_id IN (SELECT related_entity_id FROM bidirectional_relations)
          OR r2.to_entity_id IN (SELECT related_entity_id FROM bidirectional_relations)
        )
        AND r2.relation_type IN ('contains', 'defines', 'extends')  -- Parent relationships only
      `
          : sql`SELECT NULL AS id LIMIT 0`
      }
    ),
    
    -- Step 4: Aggregate all relations (1-hop + optional 2-hop)
    all_relations AS (
      SELECT * FROM bidirectional_relations
      ${enableTwoHop ? sql`UNION ALL SELECT * FROM two_hop_relations WHERE id IS NOT NULL` : sql``}
    ),
    
    -- Step 5: Collect related entities
    related_entities AS (
      SELECT DISTINCT e.id, e.label, e.chunk_id
      FROM "GraphEntity" e
      WHERE e.id IN (SELECT related_entity_id FROM all_relations)
    ),
    
    -- Step 6: Aggregate entities per chunk
    chunk_entities AS (
      SELECT 
        COALESCE(me.chunk_id, re.chunk_id) AS chunk_id,
        ARRAY_AGG(DISTINCT me.label) FILTER (WHERE me.label IS NOT NULL) AS matched_labels,
        ARRAY_AGG(DISTINCT re.label) FILTER (WHERE re.label IS NOT NULL) AS related_labels
      FROM matched_entities me
      FULL OUTER JOIN related_entities re ON me.chunk_id = re.chunk_id
      WHERE COALESCE(me.chunk_id, re.chunk_id) IS NOT NULL
      GROUP BY COALESCE(me.chunk_id, re.chunk_id)
    ),
    
    -- Step 7: Calculate dynamic graph score with temporal decay & density normalization
    chunk_scores AS (
      SELECT 
        ce.chunk_id,
        ce.matched_labels,
        ce.related_labels,
        COUNT(r.id) AS relation_count,
        -- Weighted average with temporal decay
        AVG(
          r.weight * EXP(-${temporalDecayRate} * 
            GREATEST(0, EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 86400)
          )
        ) AS avg_decayed_weight
      FROM chunk_entities ce
      LEFT JOIN all_relations r 
        ON (r.from_entity_id IN (
              SELECT e.id FROM "GraphEntity" e WHERE e.chunk_id = ce.chunk_id
            )
            OR r.to_entity_id IN (
              SELECT e.id FROM "GraphEntity" e WHERE e.chunk_id = ce.chunk_id
            ))
      GROUP BY ce.chunk_id, ce.matched_labels, ce.related_labels
    )
    
    -- Step 8: Join with chunks and apply density normalization
    SELECT 
      c.id::text AS chunk_id,
      c.content,
      COALESCE(ARRAY_TO_STRING(cs.matched_labels, ','), '') AS matched_entities,
      COALESCE(ARRAY_TO_STRING(cs.related_labels, ','), '') AS related_entities,
      -- Density-normalized graph score: log(1 + avgWeight) / log(1 + relationCount)
      COALESCE(
        LN(1 + COALESCE(cs.avg_decayed_weight, 0)) / 
        GREATEST(1, LN(1 + cs.relation_count)),
        0
      ) AS graph_score,
      COALESCE(cs.relation_count, 0)::integer AS relation_count
    FROM "DocumentChunk" c
    INNER JOIN chunk_scores cs ON c.id = cs.chunk_id
    WHERE c.source_id = ANY(${sourceIds})
    ORDER BY graph_score DESC
  `);

  return (
    results as unknown as {
      rows: Array<{
        chunk_id: string;
        content: string;
        matched_entities: string;
        related_entities: string;
        graph_score: number;
        relation_count: number;
      }>;
    }
  ).rows.map((row) => ({
    chunkId: row.chunk_id,
    content: row.content,
    matchedEntities: row.matched_entities
      ? row.matched_entities.split(',').filter(Boolean)
      : [],
    relatedEntities: row.related_entities
      ? row.related_entities.split(',').filter(Boolean)
      : [],
    graphScore: Number(row.graph_score),
    relationCount: Number(row.relation_count),
  }));
}
