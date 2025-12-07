/**
 * RAG Database Operations
 * Store and retrieve document chunks with embeddings
 */

import 'server-only';

import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { documentChunk } from '@/lib/db/schema';

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
export async function getChunksFromSources(
  sourceIds: string[],
): Promise<
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
