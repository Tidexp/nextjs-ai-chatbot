/**
 * API Route: Google Cloud Vision OCR
 * POST /api/ocr
 *
 * Body: {
 *   imageBase64?: string,  // Base64 encoded image (without data:image prefix)
 *   imageUrl?: string      // OR URL to image
 * }
 *
 * Response: {
 *   text: string,
 *   confidence?: number,
 *   language?: string,
 *   error?: string
 * }
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import vision from '@google-cloud/vision';
import { auth } from '@/app/(auth)/auth';

// Initialize Vision client with credentials from env
let visionClient: vision.ImageAnnotatorClient | null = null;

function getVisionClient() {
  if (!visionClient) {
    try {
      const credentials = JSON.parse(
        process.env.GOOGLE_CLOUD_VISION_CREDENTIALS || '{}',
      );

      visionClient = new vision.ImageAnnotatorClient({
        credentials,
      });

      console.log('[OCR] Vision API client initialized');
    } catch (error) {
      console.error('[OCR] Failed to initialize Vision client:', error);
      throw new Error('Vision API not configured');
    }
  }
  return visionClient;
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageBase64, imageUrl } = await request.json();

    if (!imageBase64 && !imageUrl) {
      return NextResponse.json(
        { error: 'Missing imageBase64 or imageUrl' },
        { status: 400 },
      );
    }

    console.log(
      `[OCR] Processing ${imageBase64 ? 'base64 image' : `URL: ${imageUrl}`}`,
    );

    const client = getVisionClient();

    // Prepare request based on input type
    // biome-ignore lint/suspicious/noImplicitAnyLet: Vision API response type
    let result;
    if (imageBase64) {
      // From base64 encoded image
      [result] = await client.textDetection({
        image: {
          content: imageBase64,
        },
      });
    } else if (imageUrl) {
      // From image URL
      [result] = await client.textDetection(imageUrl);
    }

    // Extract text from response
    const detectedText = result?.fullTextAnnotation?.text || '';
    const confidence = result?.fullTextAnnotation?.pages?.[0]?.confidence;
    const language = result?.textAnnotations?.[0]?.locale;

    console.log(
      `[OCR] Extracted ${detectedText.length} characters${language ? ` (language: ${language})` : ''}`,
    );

    return NextResponse.json({
      text: detectedText,
      confidence,
      language,
    });
  } catch (error: any) {
    console.error('[OCR] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'OCR processing failed',
      },
      { status: 500 },
    );
  }
}
