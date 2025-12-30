/**
 * Source topic similarity detection using semantic embeddings
 * Groups sources by topic to ensure versioning only applies to related content
 */

import { generateEmbedding, cosineSimilarity } from '@/lib/rag/embeddings';

/**
 * Cache for title embeddings to avoid re-computing
 */
const embeddingCache = new Map<string, number[]>();

/**
 * Get embedding for a title, using cache when available
 */
async function getTitleEmbedding(title: string): Promise<number[]> {
  const cached = embeddingCache.get(title);
  if (cached) return cached;

  const embedding = await generateEmbedding(title);
  embeddingCache.set(title, embedding);
  return embedding;
}

/**
 * Calculate semantic similarity between two titles using all-MiniLM-L6-v2 embeddings
 * Returns a score between 0 and 1 (cosine similarity)
 * Much more accurate than Jaccard for conceptual similarity
 */
async function semanticTitleSimilarity(
  title1: string,
  title2: string,
): Promise<number> {
  if (title1.toLowerCase() === title2.toLowerCase()) return 1.0;

  const [embedding1, embedding2] = await Promise.all([
    getTitleEmbedding(title1),
    getTitleEmbedding(title2),
  ]);

  return cosineSimilarity(embedding1, embedding2);
}

/**
 * Check if two sources are about the same topic
 * Uses semantic similarity via all-MiniLM-L6-v2 embeddings
 */
export async function areSameTopic(
  title1: string,
  title2: string,
  similarityThreshold = 0.6,
): Promise<boolean> {
  // Semantic similarity is more accurate than Jaccard similarity
  const similarity = await semanticTitleSimilarity(title1, title2);
  return similarity >= similarityThreshold;
}

/**
 * Find sources that are about the same topic
 * Groups sources by semantic similarity for versioning
 */
export async function findSameTopicSources(
  currentTitle: string,
  allSources: Array<{ id: string; title: string; createdAt: Date }>,
  similarityThreshold = 0.6,
): Promise<Array<{ id: string; title: string; createdAt: Date }>> {
  const currentEmbedding = await getTitleEmbedding(currentTitle);

  // Compute similarities with all sources in parallel
  const similarities = await Promise.all(
    allSources.map(async (source) => ({
      source,
      similarity: await semanticTitleSimilarity(currentTitle, source.title),
    })),
  );

  // Filter by threshold
  return similarities
    .filter((item) => item.similarity >= similarityThreshold)
    .map((item) => item.source);
}

/**
 * Clear embedding cache (useful for testing or memory management)
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}
