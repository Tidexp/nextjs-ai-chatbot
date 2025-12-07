/**
 * RAG (Retrieval-Augmented Generation) Core Functions
 * Uses Hugging Face free embeddings for semantic search
 */

import { HfInference } from '@huggingface/inference';

// Use SDK since it handles the new router.huggingface.co endpoint automatically
const USE_DIRECT_API = false;

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Model configuration
const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const CHUNK_SIZE = 350; // tokens (approximate, ~4 chars per token)
const CHUNK_OVERLAP = 75;

/**
 * Generate embedding vector for text using Hugging Face
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Use direct API to avoid verbose SDK logging
    if (USE_DIRECT_API) {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${EMBEDDING_MODEL}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
            'x-wait-for-model': 'true',
          },
          body: JSON.stringify({
            inputs: text,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HF API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      return Array.isArray(result) ? result : Array.from(result);
    }

    // Fallback to SDK if direct API disabled
    const result = await hf.featureExtraction({
      model: EMBEDDING_MODEL,
      inputs: text,
      waitForModel: true,
    });
    return Array.from(result as any as Float32Array);
  } catch (error: any) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Split text into chunks with overlap
 * Simple approach: split by sentences/paragraphs first
 */
export function chunkText(
  text: string,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP,
): string[] {
  if (!text || text.length === 0) return [];

  // Split by sentences/paragraphs
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    // Estimate tokens (rough: 4 chars = 1 token)
    const estimatedTokens = Math.ceil(currentChunk.length / 4);

    if (
      estimatedTokens + Math.ceil(sentence.length / 4) > chunkSize &&
      currentChunk.length > 0
    ) {
      // Save current chunk and start new one with overlap
      chunks.push(currentChunk.trim());
      // Keep last ~100 tokens for context (very rough approximation)
      currentChunk = currentChunk.slice(-overlap * 4) + sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Find most relevant chunks using semantic similarity
 */
export function findRelevantChunks(
  queryEmbedding: number[],
  chunks: Array<{ content: string; embedding: number[]; index: number }>,
  topK = 3,
  threshold = 0.5,
): Array<{ content: string; similarity: number; index: number }> {
  // Calculate similarities
  const scoredChunks = chunks
    .map((chunk) => ({
      content: chunk.content,
      index: chunk.index,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .filter((chunk) => chunk.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return scoredChunks;
}

/**
 * Estimate token count (very rough: divide by 4)
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Format context from relevant chunks for LLM
 */
export function formatContextForLLM(
  relevantChunks: Array<{ content: string; similarity: number; index: number }>,
): string {
  if (relevantChunks.length === 0) {
    return 'No relevant sources found.';
  }

  return relevantChunks
    .map(
      (chunk, i) =>
        `=== CHUNK ${i + 1} (Relevance: ${(chunk.similarity * 100).toFixed(0)}%) ===\n${chunk.content}\n=== END CHUNK ${i + 1} ===`,
    )
    .join('\n\n');
}
