/**
 * RAG Database Operations
 * Store and retrieve document chunks with embeddings
 */

import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';
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
  const BATCH_SIZE = 10;
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
    // @ts-ignore - Duplicate drizzle-orm installations cause type conflicts
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
  await db
    .delete(documentChunk)
    // @ts-ignore - Duplicate drizzle-orm installations cause type conflicts
    .where(eq(documentChunk.sourceId, sourceId));
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
    // @ts-ignore - Duplicate drizzle-orm installations cause type conflicts
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
 * Store entities and lightweight co-occurrence relations for a single chunk.
 * Uses Postgres only (no separate graph DB) to keep it free and reversible.
 */
export async function storeGraphEntitiesAndRelations(options: {
  sourceId: string;
  chunkId?: string;
  entities: GraphEntityInput[];
  relationType?: string;
}): Promise<{ entityIds: string[]; relationCount: number }> {
  const { sourceId, chunkId, entities, relationType = 'co_occurs' } = options;

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

  const rows = dedupedEntities.map((entity) => ({
    sourceId,
    chunkId: chunkId || null,
    label: entity.label,
    type: entity.type,
    canonicalLabel: entity.canonicalLabel,
    metadata: entity.metadata,
  }));

  await db
    .insert(graphEntity)
    .values(rows as any)
    .onConflictDoNothing();

  const labels = rows.map((row) => row.label);
  const entitiesInDb = await db
    .select()
    .from(graphEntity)
    // @ts-ignore - Duplicate drizzle-orm installations cause type conflicts
    .where(
      and(
        eq(graphEntity.sourceId, sourceId),
        inArray(graphEntity.label, labels),
      ),
    );

  const pairs: Array<{ from: string; to: string }> = [];
  for (let i = 0; i < entitiesInDb.length; i++) {
    for (let j = i + 1; j < entitiesInDb.length; j++) {
      const fromId = (entitiesInDb[i] as any).id;
      const toId = (entitiesInDb[j] as any).id;
      if (!fromId || !toId || fromId === toId) continue;
      pairs.push({ from: fromId, to: toId });
    }
  }

  const relationRows = pairs.map((pair) => ({
    sourceId,
    fromEntityId: pair.from,
    toEntityId: pair.to,
    relationType,
    evidenceChunkId: chunkId || null,
    weight: 1,
  }));

  if (relationRows.length > 0) {
    await db
      .insert(graphRelation)
      .values(relationRows as any)
      .onConflictDoNothing();
  }

  return {
    entityIds: entitiesInDb.map((entity: any) => entity.id),
    relationCount: relationRows.length,
  };
}

/**
 * Find chunks connected to entities mentioned in the query.
 * Expands context via graph relations for richer retrieval.
 */
export async function getChunksByEntities(options: {
  sourceIds: string[];
  entityLabels: string[];
}): Promise<
  Array<{
    chunkId: string;
    content: string;
    matchedEntities: string[];
    relatedEntities: string[];
  }>
> {
  const { sourceIds, entityLabels } = options;

  if (sourceIds.length === 0 || entityLabels.length === 0) {
    return [];
  }

  const lowerLabels = entityLabels.map((label) => label.toLowerCase());

  // Find matching entities
  const matchedEntities = await db
    .select()
    .from(graphEntity)
    // @ts-ignore
    .where(
      and(
        inArray(graphEntity.sourceId, sourceIds),
        inArray(graphEntity.canonicalLabel, lowerLabels),
      ),
    );

  if (matchedEntities.length === 0) {
    return [];
  }

  const matchedIds = matchedEntities.map((e: any) => e.id);

  // Find relations to expand context
  const relations = await db
    .select()
    .from(graphRelation)
    // @ts-ignore
    .where(
      and(
        inArray(graphRelation.sourceId, sourceIds),
        inArray(graphRelation.fromEntityId, matchedIds),
      ),
    );

  const relatedEntityIds = Array.from(
    new Set(relations.map((r: any) => r.toEntityId)),
  );

  const relatedEntities =
    relatedEntityIds.length > 0
      ? await db
          .select()
          .from(graphEntity)
          // @ts-ignore
          .where(inArray(graphEntity.id, relatedEntityIds))
      : [];

  // Get chunks associated with matched and related entities
  const allEntityIds = [...matchedIds, ...relatedEntityIds];
  const entitiesWithChunks = await db
    .select()
    .from(graphEntity)
    // @ts-ignore
    .where(inArray(graphEntity.id, allEntityIds));

  const chunkIds = Array.from(
    new Set(
      entitiesWithChunks
        .map((e: any) => e.chunkId)
        .filter((id: any) => id != null),
    ),
  );

  if (chunkIds.length === 0) {
    return [];
  }

  const chunks = await db
    .select()
    .from(documentChunk)
    // @ts-ignore
    .where(inArray(documentChunk.id, chunkIds));

  // Map chunks to their entity associations
  return chunks.map((chunk: any) => {
    const chunkEntities = entitiesWithChunks.filter(
      (e: any) => e.chunkId === chunk.id,
    );
    const matched = chunkEntities
      .filter((e: any) => matchedIds.includes(e.id))
      .map((e: any) => e.label);
    const related = chunkEntities
      .filter((e: any) => relatedEntityIds.includes(e.id))
      .map((e: any) => e.label);

    return {
      chunkId: chunk.id,
      content: chunk.content,
      matchedEntities: matched,
      relatedEntities: related,
    };
  });
}
