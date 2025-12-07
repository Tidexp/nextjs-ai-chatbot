/**
 * API Route: Semantic search over document chunks
 * POST /api/rag/search
 *
 * Body: {
 *   query: string,
 *   sourceIds: string[],
 *   topK?: number (default: 3),
 *   similarityThreshold?: number (default: 0.5)
 * }
 *
 * Response: {
 *   success: boolean,
 *   results: Array<{
 *     content: string,
 *     relevance: number,
 *     sourceId: string,
 *     chunkIndex: number
 *   }>,
 *   formattedContext: string,
 *   error?: string
 * }
 */

import { type NextRequest, NextResponse } from 'next/server';
import {
  generateEmbedding,
  findRelevantChunks,
  formatContextForLLM,
} from '@/lib/rag/embeddings';
import { getChunksFromSources } from '@/lib/rag/db';
import { auth } from '@/app/(auth)/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      query,
      sourceIds,
      topK = 3,
      similarityThreshold = 0.5,
    } = await request.json();

    if (!query || !sourceIds || !Array.isArray(sourceIds)) {
      return NextResponse.json(
        { error: 'Missing or invalid query or sourceIds' },
        { status: 400 },
      );
    }

    if (sourceIds.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        formattedContext: '',
      });
    }

    console.log(`[RAG Search] Query: "${query}", Sources: ${sourceIds.length}`);

    // 1. Generate embedding for the query
    // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
    let queryEmbedding;
    try {
      queryEmbedding = await generateEmbedding(query);
    } catch (error) {
      console.error('[RAG Search] Failed to embed query:', error);
      throw new Error(`Failed to embed query: ${error}`);
    }

    // 2. Fetch all chunks from the specified sources
    const sourceChunks = await getChunksFromSources(sourceIds);

    if (sourceChunks.length === 0) {
      console.log('[RAG Search] No chunks found for specified sources');
      return NextResponse.json({
        success: true,
        results: [],
        formattedContext: 'No documents loaded for search.',
      });
    }

    console.log(`[RAG Search] Searching across ${sourceChunks.length} chunks`);

    // 3. Find relevant chunks using semantic similarity
    const relevantChunks = findRelevantChunks(
      queryEmbedding,
      sourceChunks.map((chunk) => ({
        content: chunk.content,
        embedding: chunk.embedding,
        index: chunk.index,
      })),
      topK,
      similarityThreshold,
    );

    console.log(
      `[RAG Search] Found ${relevantChunks.length} relevant chunks above threshold ${similarityThreshold}`,
    );

    // 4. Map back to include sourceId and chunkIndex
    const results = relevantChunks.map((chunk) => {
      // Find the original chunk to get metadata
      const originalChunk = sourceChunks.find(
        (sc) => sc.content === chunk.content,
      );
      return {
        content: chunk.content,
        relevance: chunk.similarity,
        sourceId: originalChunk?.sourceId || 'unknown',
        chunkIndex: originalChunk?.index || -1,
      };
    });

    // 5. Format results for LLM context
    const formattedContext = formatContextForLLM(relevantChunks);

    return NextResponse.json({
      success: true,
      results,
      formattedContext,
    });
  } catch (error) {
    console.error('[RAG Search] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to search documents';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
