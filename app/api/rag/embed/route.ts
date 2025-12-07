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
import { storeDocumentChunks } from '@/lib/rag/db';
import { auth } from '@/app/(auth)/auth';

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
    // Using 350 tokens per chunk to create more focused embeddings
    const chunks = chunkText(sanitizedContent, 350, 75); // 350 token chunks, 75 token overlap
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
    const BATCH_SIZE = 10; // Process 10 chunks at a time

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
      const batchPromises = batchChunks.map(async (chunkContent, idx) => {
        const globalIndex = batchStart + idx;
        // Double-sanitize each chunk to ensure no null bytes slip through
        const sanitizedChunk = sanitizeText(chunkContent);
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
      });

      const batchResults = await Promise.all(batchPromises);
      chunkRecords.push(...batchResults);

      // Calculate tokens
      for (const record of batchResults) {
        tokensTotal += record.tokenCount;
      }

      console.log(
        `[RAG Embed] Processed batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (chunks ${batchStart + 1}-${batchEnd}/${chunks.length})`,
      );

      // Small delay between batches to avoid overwhelming the API
      if (batchEnd < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // 3. Store chunks with embeddings in database
    await storeDocumentChunks(sourceId, chunkRecords);

    console.log(
      `[RAG Embed] Successfully stored ${chunkRecords.length} chunks for source ${sourceId}`,
    );

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
