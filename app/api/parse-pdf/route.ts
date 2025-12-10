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

// Force Node.js runtime so pdf-parse can run (uses Node APIs, not Edge-safe)
export const runtime = 'nodejs';

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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use pdf2json for reliable server-side parsing (already installed)
    const PDFParser = (await import('pdf2json')).default;

    const pdfParser = new PDFParser(null, true);

    // Parse PDF and extract text
    const parsePromise = new Promise<{ text: string; pages: number }>(
      (resolve, reject) => {
        pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
          try {
            let text = '';
            let pages = 0;

            if (pdfData?.Pages) {
              pages = pdfData.Pages.length;
              for (const page of pdfData.Pages) {
                if (page.Texts) {
                  for (const textItem of page.Texts) {
                    if (textItem.R) {
                      for (const run of textItem.R) {
                        if (run.T) {
                          try {
                            text += `${decodeURIComponent(run.T)} `;
                          } catch {
                            // If URI decode fails, use the raw text
                            text += `${run.T} `;
                          }
                        }
                      }
                    }
                  }
                }
                text += '\n';
              }
            }

            resolve({ text: text.trim(), pages });
          } catch (err) {
            reject(err);
          }
        });

        pdfParser.on('pdfParser_dataError', (error: any) => {
          reject(new Error(error.parserError || 'PDF parsing failed'));
        });

        pdfParser.parseBuffer(buffer);
      },
    );

    const { text, pages } = await parsePromise;

    console.log(
      `[PDF Parse] Extracted ${text.length} chars from ${file.name} (${pages} pages)`,
    );

    // Note: PDF image OCR disabled due to complexity
    // PDFs with images: text extraction works, image OCR requires additional tooling
    // Workaround: Convert PDF to images externally or upload DOCX with embedded images instead
    console.log(
      '[PDF Parse] Note: PDF image OCR not available - text-only extraction completed',
    );
    const finalText = text;

    return NextResponse.json({
      success: true,
      text,
      pages,
    });
  } catch (error: any) {
    console.error('[PDF Parse] Error:', error);
    return NextResponse.json(
      { error: `Failed to parse PDF: ${error.message || 'Unknown error'}` },
      { status: 500 },
    );
  }
}
