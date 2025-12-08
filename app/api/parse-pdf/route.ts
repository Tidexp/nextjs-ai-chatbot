/**
 * API Route: Parse PDF and extract text
 * POST /api/parse-pdf
 *
 * Body: FormData with file
 *
 * Response: {
 *   success: boolean,
 *   text: string,
 *   pages: number,
 *   error?: string
 * }
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();

    try {
      // Use pdfjs-dist for server-side parsing; disable worker to avoid worker bundle resolution
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      // Ensure worker is disabled to avoid missing worker bundle resolution in Turbopack
      if (pdfjsLib.GlobalWorkerOptions) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (pdfjsLib.GlobalWorkerOptions as any).workerSrc =
          'node_modules/pdfjs-dist/build/pdf.worker.min.js';
      }

      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        // The following flags run parsing in-process without worker and avoid font fetches
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        disableWorker: true,
        useWorkerFetch: false,
        disableFontFace: true,
        isEvalSupported: false,
        isOffscreenCanvasSupported: false,
      } as any);

      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      // Extract text from all pages
      let fullText = '';
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText = `${fullText}${pageText}\n`;
      }

      console.log(
        `[PDF Parse] Extracted ${fullText.length} chars from ${file.name} (${numPages} pages)`,
      );

      return NextResponse.json({
        success: true,
        text: fullText.trim(),
        pages: numPages,
      });
    } catch (pdfError: any) {
      console.error('[PDF Parse] Error parsing PDF:', pdfError);
      return NextResponse.json(
        {
          error: `Failed to parse PDF: ${pdfError.message}`,
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error('[PDF Parse] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 },
    );
  }
}
