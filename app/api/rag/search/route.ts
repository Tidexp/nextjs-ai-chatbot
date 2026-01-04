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
  formatContextForLLM,
  cosineSimilarity,
} from '@/lib/rag/embeddings';
import {
  getChunksFromSources,
  getChunksByEntities,
  expandEntitiesWithSemantics,
} from '@/lib/rag/db';
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
      topK = 15,
      similarityThreshold = 0.15,
      enableGraphTwoHop = false,
      graphBoost = 0.3,
      maxChunksPerSource = 2, // NEW: Receive from UI
    } = await request.json();

    // Dev override: allow graphBoost via query param for quick testing
    const url = new URL(request.url);
    const graphBoostOverride = Number(url.searchParams.get('graphBoost'));
    const effectiveGraphBoost = Number.isNaN(graphBoostOverride)
      ? graphBoost
      : graphBoostOverride;

    let adjustedTopK = topK;
    if (
      query.toLowerCase().includes('difference') ||
      query.toLowerCase().includes('compare') ||
      query.toLowerCase().includes('versus')
    ) {
      adjustedTopK = 5; // Get more chunks for comparison queries
      console.log(
        `[RAG Search] Comparison query detected, increasing topK to ${adjustedTopK}`,
      );
    }

    if (sourceIds.length > 5) {
      adjustedTopK = Math.max(
        adjustedTopK,
        Math.min(sourceIds.length, topK * 3),
      );
      console.log(
        `[RAG Search] Many sources detected (${sourceIds.length}), increasing topK to ${adjustedTopK} for diversity`,
      );
    }

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

    // 3. Source-aware vector search: ensure each source gets representation
    const scoredChunks = sourceChunks
      .map((chunk) => ({
        content: chunk.content,
        embedding: chunk.embedding,
        index: chunk.index,
        sourceId: chunk.sourceId,
        similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .filter((chunk) => chunk.similarity >= similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity);

    // If no chunks pass threshold, take best from each source anyway
    const passingScoredChunks =
      scoredChunks.length > 0
        ? scoredChunks
        : sourceChunks
            .map((chunk) => ({
              content: chunk.content,
              embedding: chunk.embedding,
              index: chunk.index,
              sourceId: chunk.sourceId,
              similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
            }))
            .sort((a, b) => b.similarity - a.similarity);

    // Group by source
    const chunksBySourceVector = new Map<string, typeof passingScoredChunks>();
    for (const chunk of passingScoredChunks) {
      if (!chunksBySourceVector.has(chunk.sourceId)) {
        chunksBySourceVector.set(chunk.sourceId, []);
      }
      const chunks = chunksBySourceVector.get(chunk.sourceId);
      if (chunks) {
        chunks.push(chunk);
      }
    }

    // Get best chunk from EACH source first (guarantees diversity)
    const diverseVectorChunks: typeof passingScoredChunks = [];
    for (const [sourceId, chunks] of chunksBySourceVector.entries()) {
      if (chunks.length > 0) {
        diverseVectorChunks.push(chunks[0]); // Top chunk per source
      }
    }

    // Fill remaining slots with next-best across all sources (max 2 chunks per source)
    const chunkCountBySource = new Map<string, number>();
    for (const chunk of diverseVectorChunks) {
      chunkCountBySource.set(chunk.sourceId, 1); // Already took 1 from each
    }

    const remainingVector: typeof passingScoredChunks = [];
    for (const chunk of passingScoredChunks) {
      // Skip if already in diverse chunks
      if (diverseVectorChunks.some((d) => d.content === chunk.content)) {
        continue;
      }

      const currentCount = chunkCountBySource.get(chunk.sourceId) || 0;
      if (currentCount >= maxChunksPerSource) {
        continue;
      }

      // Add this chunk
      remainingVector.push(chunk);
      chunkCountBySource.set(chunk.sourceId, currentCount + 1);

      // Stop when we have enough
      if (remainingVector.length >= adjustedTopK - diverseVectorChunks.length) {
        break;
      }
    }
    // 3b. Graph RAG: Expand entities and find related chunks across sources
    let graphChunks: Array<{
      content: string;
      matchedEntities: string[];
      graphScore: number;
    }> = [];
    let extractedEntities: string[] = [];
    let extractionError: string | null = null;
    let extractionLogs: string[] = [];

    try {
      console.log(
        `[RAG Search] Starting entity extraction for query: "${query}"`,
      );
      const extractionResult = await extractEntities(query);
      const queryEntities = extractionResult.entities;
      extractionLogs = extractionResult.logs;
      extractedEntities = queryEntities.map((e) => e.label);
      console.log(
        `[RAG Search] Entity extraction complete. Found ${queryEntities.length} entities: ${extractedEntities.join(', ')}`,
      );
      if (queryEntities.length > 0) {
        console.log(
          `[RAG Search] Query entities: ${queryEntities.map((e) => e.label).join(', ')}`,
        );

        // EXPANSION: Get related entities through graph relationships
        const expandedEntities = await expandEntitiesWithSemantics({
          sourceIds,
          entityLabels: queryEntities.map((e) => e.label),
          maxHops: 1, // 1-hop expansion for cross-source discovery
        });

        console.log(
          `[RAG Search] Expanded to ${expandedEntities.length} entities (from ${queryEntities.length})`,
        );

        // Limit entities for 2-hop to prevent exponential query explosion (top 8 most relevant)
        const limitedEntities = enableGraphTwoHop
          ? expandedEntities.slice(0, 8)
          : expandedEntities;

        console.log(
          `[RAG Search] Using ${limitedEntities.length} entities for graph query (2-hop: ${enableGraphTwoHop})`,
        );

        const entityResults = await getChunksByEntities({
          sourceIds,
          entityLabels: limitedEntities,
          enableTwoHop: enableGraphTwoHop, // Use request parameter
        });
        console.log(`[RAG Search] Graph 2-Hop enabled: ${enableGraphTwoHop}`);
        graphChunks = entityResults;
        console.log(
          `[RAG Search] Graph search: ${graphChunks.length} entity-matched chunks`,
        );
      }
    } catch (graphError) {
      console.warn('[RAG Search] Graph search failed (non-fatal):', graphError);
      extractionError =
        graphError instanceof Error ? graphError.message : String(graphError);
    }

    // 3c. Merge vector and graph results (prefer chunks appearing in both)
    const mergedContent = new Map<string, any>();

    // Add vector search results
    const relevantChunks = [...diverseVectorChunks, ...remainingVector];
    for (const chunk of relevantChunks) {
      mergedContent.set(chunk.content, {
        ...chunk,
        vectorScore: chunk.similarity,
        graphScore: 0,
        matchedEntities: [],
      });
    }

    // Boost chunks that also match entities (using dynamic graphScore)
    const graphLimit = Math.max(topK * 2, sourceIds.length * 2);

    for (const graphChunk of graphChunks) {
      if (mergedContent.has(graphChunk.content)) {
        const existing = mergedContent.get(graphChunk.content);
        existing.graphScore = graphChunk.graphScore;
        existing.matchedEntities = graphChunk.matchedEntities;
      } else if (mergedContent.size < graphLimit) {
        // CHANGE: use graphLimit instead of topK * 2
        // Add high-quality graph results even if vector score was low
        mergedContent.set(graphChunk.content, {
          content: graphChunk.content,
          vectorScore: 0,
          graphScore: graphChunk.graphScore,
          similarity: similarityThreshold, // Treat as threshold match
          matchedEntities: graphChunk.matchedEntities,
        });
      }
    }

    // Sort by hybrid score (vector + weighted graph boost)
    // HybridScore = VectorSimilarity + (effectiveGraphBoost * GraphScore)
    const allHybridChunks = Array.from(mergedContent.values()).map((chunk) => ({
      ...chunk,
      hybridScore: chunk.vectorScore + chunk.graphScore * effectiveGraphBoost,
    }));

    // Source-aware selection: prioritize getting at least 1 chunk per source
    const chunksBySource = new Map<string, any[]>();
    for (const chunk of allHybridChunks) {
      const originalChunk = sourceChunks.find(
        (sc) => sc.content === chunk.content,
      );
      const sid = originalChunk?.sourceId || 'unknown';
      if (!chunksBySource.has(sid)) {
        chunksBySource.set(sid, []);
      }
      const chunks = chunksBySource.get(sid);
      if (chunks) {
        chunks.push(chunk);
      }
    }

    // Get top chunk from each source first (ensures diversity)
    const diverseChunks: any[] = [];
    for (const [sourceId, chunks] of chunksBySource.entries()) {
      chunks.sort((a, b) => b.hybridScore - a.hybridScore);
      diverseChunks.push(chunks[0]);
    }

    // Fill remaining slots with highest scores across all sources
    const remaining = allHybridChunks
      .filter((c) => !diverseChunks.includes(c))
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, Math.max(0, adjustedTopK - diverseChunks.length));

    const hybridChunks = [...diverseChunks, ...remaining]
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, adjustedTopK);

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
        vectorScore: chunk.vectorScore,
        graphScore: chunk.graphScore,
        hybridScore: chunk.hybridScore,
        sourceId: originalChunk?.sourceId || 'unknown',
        chunkIndex: originalChunk?.index || -1,
      };
    });

    // 5. Format results for LLM context
    const formattedContext = formatContextForLLM(hybridChunks);

    // Calculate statistics for report
    const vectorOnlyChunks = hybridChunks.filter(
      (c) => c.vectorScore > 0 && c.graphScore === 0,
    );
    const graphOnlyChunks = hybridChunks.filter(
      (c) => c.vectorScore === 0 && c.graphScore > 0,
    );
    const bothChunks = hybridChunks.filter(
      (c) => c.vectorScore > 0 && c.graphScore > 0,
    );

    // Calculate average scores
    const avgVectorScore =
      hybridChunks.reduce((sum, c) => sum + c.vectorScore, 0) /
      hybridChunks.length;
    const avgGraphScore =
      hybridChunks.reduce((sum, c) => sum + c.graphScore, 0) /
      hybridChunks.length;
    const avgHybridScore =
      hybridChunks.reduce((sum, c) => sum + c.hybridScore, 0) /
      hybridChunks.length;

    // Calculate max weights from graph chunks
    const maxWeights = graphChunks
      .filter((c) => mergedContent.has(c.content))
      .map((c) => ({
        content: `${c.content.slice(0, 50)}...`,
        matchedEntities: c.matchedEntities?.length || 0,
        graphScore: c.graphScore,
      }))
      .sort((a, b) => b.graphScore - a.graphScore);

    return NextResponse.json({
      success: true,
      results,
      formattedContext,
      debug: {
        query,
        extractedEntities,
        extractionError,
        extractionLogs,
        queryEntitiesCount:
          graphChunks.length > 0
            ? hybridChunks.filter((c) => c.matchedEntities?.length > 0).length
            : 0,
        vectorResultsCount: hybridChunks.filter((c) => c.vectorScore > 0)
          .length,
        graphResultsCount: hybridChunks.filter((c) => c.graphScore > 0).length,
      },
      stats: {
        totalChunks: hybridChunks.length,
        vectorOnlyChunks: vectorOnlyChunks.length,
        graphOnlyChunks: graphOnlyChunks.length,
        bothChunks: bothChunks.length,
        avgVectorScore: avgVectorScore.toFixed(3),
        avgGraphScore: avgGraphScore.toFixed(3),
        avgHybridScore: avgHybridScore.toFixed(3),
        graphBoostUsed: effectiveGraphBoost,
        twoHopEnabled: enableGraphTwoHop,
        maxWeights: maxWeights.slice(0, 5), // Top 5 for brevity
      },
    });
  } catch (error) {
    console.error('[RAG Search] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to search documents';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
