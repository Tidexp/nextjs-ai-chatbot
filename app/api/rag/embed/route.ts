/**
 * API Route: Generate embeddings for uploaded source
 * POST /api/rag/embed
 *
 * Body: {
 *   sourceId: string,
 *   content: string
 * }
 *
 * Response: {
 *   success: boolean,
 *   chunksCount: number,
 *   tokensEstimate: number,
 *   error?: string
 * }
 */

import { type NextRequest, NextResponse } from 'next/server';
import {
  generateEmbedding,
  chunkText,
  estimateTokenCount,
} from '@/lib/rag/embeddings';
import { storeDocumentChunks, getSourceChunks } from '@/lib/rag/db';
import { extractAndStoreGraphData } from '@/lib/rag/graph';
import { autoDetectSourceMetadata } from '@/lib/rag/source-reliability-auto';
import { auth } from '@/app/(auth)/auth';
import { instructorSource } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/**
 * Sanitize text content to remove null bytes and control characters
 */
function sanitizeText(text: string): string {
  // Remove null bytes and control characters using char codes
  // Keeps newlines (\n = 10) and tabs (\t = 9)
  return text
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      // Keep printable chars (32+), newlines (10), tabs (9), and carriage returns (13)
      return code === 9 || code === 10 || code === 13 || code >= 32;
    })
    .join('')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sourceId, content } = await request.json();

    if (!sourceId || !content) {
      return NextResponse.json(
        { error: 'Missing sourceId or content' },
        { status: 400 },
      );
    }

    console.log(
      `[RAG Embed] Starting embedding generation for source: ${sourceId}`,
    );
    console.log(`[RAG Embed] Content length: ${content.length} chars`);

    // Sanitize content to remove null bytes before processing
    const sanitizedContent = sanitizeText(content);
    console.log(
      `[RAG Embed] Sanitized content length: ${sanitizedContent.length} chars`,
    );

    // 1. Split content into smaller chunks for better granularity
    // Using 800 tokens per chunk reduces total chunks for faster processing
    const chunks = chunkText(sanitizedContent, 800, 100); // 800 token chunks, 100 token overlap
    console.log(`[RAG Embed] Split into ${chunks.length} chunks`);

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: 'Content too short to chunk' },
        { status: 400 },
      );
    }

    // 2. Generate embeddings for each chunk in parallel batches
    const chunkRecords = [];
    let tokensTotal = 0;
    const BATCH_SIZE = 30; // Process 30 chunks at a time for better throughput

    console.log(
      `[RAG Embed] Processing ${chunks.length} chunks in batches of ${BATCH_SIZE}`,
    );

    for (
      let batchStart = 0;
      batchStart < chunks.length;
      batchStart += BATCH_SIZE
    ) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, chunks.length);
      const batchChunks = chunks.slice(batchStart, batchEnd);

      // Process batch in parallel
      const batchPromises = batchChunks
        .map(async (chunkContent, idx) => {
          const globalIndex = batchStart + idx;
          // Double-sanitize each chunk to ensure no null bytes slip through
          const sanitizedChunk = sanitizeText(chunkContent);

          // Skip chunks that are mostly garbage/binary data
          // Count printable ASCII and common UTF-8 characters
          let printableCount = 0;
          for (const char of sanitizedChunk) {
            const code = char.charCodeAt(0);
            // Count letters, numbers, spaces, punctuation, common symbols
            if (
              (code >= 32 && code <= 126) || // ASCII printable
              (code >= 192 && code <= 383) || // Latin Extended
              code === 9 ||
              code === 10 ||
              code === 13
            ) {
              printableCount++;
            }
          }

          const printableRatio =
            sanitizedChunk.length > 0
              ? printableCount / sanitizedChunk.length
              : 0;

          // Skip if less than 30% is readable text (lenient - accept mixed content)
          if (printableRatio < 0.3 || sanitizedChunk.length < 10) {
            console.log(
              `[RAG Embed] Skipping chunk ${globalIndex}: too much binary (${(printableRatio * 100).toFixed(1)}% printable, ${sanitizedChunk.length} chars)`,
            );
            return null;
          }

          const tokenCount = estimateTokenCount(sanitizedChunk);

          try {
            const embedding = await generateEmbedding(sanitizedChunk);

            return {
              content: sanitizedChunk,
              embedding,
              tokenCount,
              metadata: {
                chunkIndex: globalIndex,
                totalChunks: chunks.length,
              },
            };
          } catch (error) {
            console.error(
              `[RAG Embed] Failed to embed chunk ${globalIndex}:`,
              error,
            );
            throw new Error(`Failed to embed chunk ${globalIndex}: ${error}`);
          }
        })
        .filter((promise) => promise !== null);

      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter((r) => r !== null) as Exclude<
        (typeof batchResults)[number],
        null
      >[];
      chunkRecords.push(...validResults);

      // Calculate tokens
      for (const record of validResults) {
        tokensTotal += record.tokenCount;
      }

      console.log(
        `[RAG Embed] Processed batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (chunks ${batchStart + 1}-${batchEnd}/${chunks.length})`,
      );

      // Removed batch delay for faster processing
    }

    // 3. Store chunks with embeddings in database
    await storeDocumentChunks(sourceId, chunkRecords);

    console.log(
      `[RAG Embed] Successfully stored ${chunkRecords.length} chunks for source ${sourceId}`,
    );

    // 4. Extract entities and relations from chunks (Graph RAG)
    console.log('[RAG Embed] Extracting entities for Graph RAG...');

    try {
      // Fetch source metadata for reliability scoring
      const sourceRecords = await db
        .select()
        .from(instructorSource)
        .where(eq(instructorSource.id, sourceId))
        .limit(1);

      if (sourceRecords.length === 0) {
        throw new Error(`Source ${sourceId} not found`);
      }

      const sourceRecord = sourceRecords[0];

      // Build source metadata for reliability calculation
      // Note: sourceRecord.type is file type (markdown/code/pdf/image)
      //       sourceType for reliability should come from metadata
      const sourceMetadata = await autoDetectSourceMetadata({
        sourceUrl: sourceRecord.sourceUrl,
        title: sourceRecord.title,
        contentPreview: sourceRecord.content?.slice(0, 1000), // Add preview
        metadata: sourceRecord.metadata as Record<string, any> | undefined,
        useGeminiAssessment: true, // Enable Gemini
      });

      // Persist updated reliability metadata back to the source record
      await db
        .update(instructorSource)
        .set({
          metadata: sourceMetadata,
          reliabilitySourceType: sourceMetadata.sourceType,
          reliabilityTrustScore: sourceMetadata.trustScore,
          reliabilityAssessment: sourceMetadata.geminiAssessment,
          updatedAt: new Date(),
        })
        .where(eq(instructorSource.id, sourceId));

      // Determine version info (check if this is latest by comparing dates)
      const version = (sourceRecord.metadata as any)?.version ?? 1;

      // Check if this is the latest version (only compare with same-topic sources)
      // Import topic similarity detection
      const { findSameTopicSources } = await import(
        '@/lib/rag/source-topic-similarity'
      );

      // Get all user sources to find same-topic ones
      const allUserSources = await db
        .select({
          id: instructorSource.id,
          title: instructorSource.title,
          createdAt: instructorSource.createdAt,
        })
        .from(instructorSource)
        .where(eq(instructorSource.userId, sourceRecord.userId));

      // Find sources about the same topic using semantic similarity
      const sameTopicSources = await findSameTopicSources(
        sourceRecord.title,
        allUserSources.map((s) => ({
          id: s.id,
          title: s.title,
          createdAt: s.createdAt,
        })),
      );

      // Sort same-topic sources by creation date
      const sortedSameTopic = sameTopicSources.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );

      // Check if current source is the latest among same-topic sources
      const isLatestVersion =
        sortedSameTopic.length > 0 &&
        sourceRecord.id === sortedSameTopic[sortedSameTopic.length - 1].id;

      console.log(
        `[RAG Embed] Source metadata: type=${sourceMetadata.sourceType}, verified=${sourceMetadata.isVerified}, trustScore=${sourceMetadata.trustScore}, version=${version}, isLatest=${isLatestVersion}`,
      );

      const storedChunks = await getSourceChunks(sourceId);
      let totalEntities = 0;
      let totalRelations = 0;

      for (const chunk of storedChunks) {
        // Extract triplets from text for semantic relationships
        const { extractTriplets } = await import('@/lib/rag/graph');
        const triplets = await extractTriplets((chunk as any).content);

        const { entityCount, relationCount } = await extractAndStoreGraphData({
          sourceId,
          chunkId: (chunk as any).id,
          text: (chunk as any).content,
          triplets,
          sourceMetadata, // ← Now passing source reliability metadata
          version, // ← Now passing version info
          isLatestVersion, // ← Now passing latest version flag
        });
        totalEntities += entityCount;
        totalRelations += relationCount;
      }

      console.log(
        `[RAG Embed] Graph RAG: extracted ${totalEntities} entities, ${totalRelations} relations`,
      );
    } catch (graphError) {
      console.warn(
        '[RAG Embed] Graph extraction failed (non-fatal):',
        graphError,
      );
      // Don't fail the whole operation if graph extraction fails
    }

    return NextResponse.json({
      success: true,
      chunksCount: chunkRecords.length,
      tokensEstimate: tokensTotal,
    });
  } catch (error) {
    console.error('[RAG Embed] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to generate embeddings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
