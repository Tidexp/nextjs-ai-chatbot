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
import { getChunksFromSources, getChunksByEntities } from '@/lib/rag/db';
import { extractEntities } from '@/lib/rag/graph';
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

    console.log(
      `[RAG Search] Searching across ${sourceChunks.length} chunks from ${new Set(sourceChunks.map((c) => c.sourceId)).size} sources`,
    );

    // 3. Find relevant chunks using semantic similarity (vector search)
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
      `[RAG Search] Vector search: ${relevantChunks.length} relevant chunks`,
    );

    // 3b. Graph RAG: Extract entities from query and find related chunks
    let graphChunks: Array<{ content: string; matchedEntities: string[] }> = [];
    try {
      const queryEntities = await extractEntities(query);
      if (queryEntities.length > 0) {
        console.log(
          `[RAG Search] Query entities: ${queryEntities.map((e) => e.label).join(', ')}`,
        );
        const entityResults = await getChunksByEntities({
          sourceIds,
          entityLabels: queryEntities.map((e) => e.label),
        });
        graphChunks = entityResults;
        console.log(
          `[RAG Search] Graph search: ${graphChunks.length} entity-matched chunks`,
        );
      }
    } catch (graphError) {
      console.warn('[RAG Search] Graph search failed (non-fatal):', graphError);
    }

    // 3c. Merge vector and graph results (prefer chunks appearing in both)
    const mergedContent = new Map<string, any>();

    // Add vector search results
    for (const chunk of relevantChunks) {
      mergedContent.set(chunk.content, {
        ...chunk,
        vectorScore: chunk.similarity,
        graphScore: 0,
        matchedEntities: [],
      });
    }

    // Boost chunks that also match entities
    for (const graphChunk of graphChunks) {
      if (mergedContent.has(graphChunk.content)) {
        const existing = mergedContent.get(graphChunk.content);
        existing.graphScore = 1;
        existing.matchedEntities = graphChunk.matchedEntities;
      } else if (mergedContent.size < topK * 2) {
        // Add high-quality graph results even if vector score was low
        mergedContent.set(graphChunk.content, {
          content: graphChunk.content,
          vectorScore: 0,
          graphScore: 1,
          similarity: similarityThreshold, // Treat as threshold match
          matchedEntities: graphChunk.matchedEntities,
        });
      }
    }

    // Sort by hybrid score (vector + graph boost)
    const hybridChunks = Array.from(mergedContent.values())
      .map((chunk) => ({
        ...chunk,
        hybridScore: chunk.vectorScore + chunk.graphScore * 0.3, // 30% boost for entity match
      }))
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, topK);

    console.log(
      `[RAG Search] Hybrid result: ${hybridChunks.length} chunks (${hybridChunks.filter((c) => c.graphScore > 0).length} with entity matches)`,
    );

    // 4. Map back to include sourceId and chunkIndex with better tracking for multiple sources
    const results = hybridChunks.map((chunk) => {
      // Find all matching chunks by content
      const matchingChunks = sourceChunks.filter(
        (sc) => sc.content === chunk.content,
      );

      // If we have multiple matches, they come from different sources - use the first one
      // In practice, identical content from different sources is rare
      const originalChunk = matchingChunks[0];

      console.log(
        `[RAG Search] Chunk "${chunk.content.slice(0, 50)}..." matched to source: ${originalChunk?.sourceId || 'unknown'}`,
      );

      return {
        content: chunk.content,
        relevance: chunk.similarity,
        sourceId: originalChunk?.sourceId || 'unknown',
        chunkIndex: originalChunk?.index || -1,
      };
    });

    // 5. Format results for LLM context
    const formattedContext = formatContextForLLM(hybridChunks);

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
