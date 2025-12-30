/**
 * Automatic source reliability detection
 * Uses Gemini 2.0 Flash Lite for intelligent content assessment
 * Falls back to heuristics for local/Google Drive files
 */

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Detect if source is from Google Drive based on metadata
 */
function isGoogleDriveSource(metadata?: Record<string, any>): boolean {
  return metadata?.driveId !== undefined;
}

/**
 * Detect if source is a local uploaded file based on metadata
 */
function isLocalFileSource(metadata?: Record<string, any>): boolean {
  return metadata?.fileName !== undefined || metadata?.fileType !== undefined;
}

/**
 * Determine source type for local/Google Drive files
 * Since these are instructor-uploaded files, default to 'instructor' type
 */
function detectSourceType(
  metadata?: Record<string, any>,
  sourceUrl?: string | null,
): string {
  // If explicitly set in metadata, use it
  if (metadata?.sourceType) {
    return metadata.sourceType;
  }

  // For local files and Google Drive files, default to 'instructor'
  // These are instructor-created/uploaded content
  if (isGoogleDriveSource(metadata) || isLocalFileSource(metadata)) {
    return 'instructor';
  }

  // For pasted text (blob URLs), also treat as instructor content
  if (metadata?.type === 'pasted') {
    return 'instructor';
  }

  // Default fallback
  return 'instructor';
}

/**
 * Use Gemini 2.0 Flash Lite to assess content reliability
 * Analyzes quality, authoritativeness, and potential bias
 */
async function assessContentReliabilityWithGemini(
  title: string,
  contentPreview: string,
  metadata?: Record<string, any>,
): Promise<{
  trustScore: number;
  assessment: string;
  factors: Record<string, any>;
}> {
  try {
    const preview = contentPreview.slice(0, 500); // Limit to first 500 chars for token efficiency

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Assess the reliability and quality of this educational content.

Title: "${title}"
Preview: "${preview}"

Analyze on a scale of 0-100 considering:
1. Content clarity and organization
2. Accuracy indicators (no obvious errors)
3. Completeness (comprehensive coverage)
4. Authoritativeness (professional tone, expert language)
5. Recency/Relevance (if timestamps available)
6. Bias indicators (fair, balanced perspective)

Respond with ONLY a JSON object (no markdown, no code blocks):
{
  "score": <0-100>,
  "factors": {
    "clarity": <0-100>,
    "accuracy": <0-100>,
    "completeness": <0-100>,
    "authority": <0-100>,
    "relevance": <0-100>,
    "bias": <0-100>
  },
  "summary": "<brief assessment>"
}`,
            },
          ],
        },
      ],
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Clean response in case it has markdown wrapping
    const cleanedText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanedText);

    return {
      trustScore: Math.min(100, Math.max(0, parsed.score || 65)),
      assessment: parsed.summary || 'No assessment available',
      factors: parsed.factors || {},
    };
  } catch (error) {
    console.warn(
      'Gemini reliability assessment failed, using fallback:',
      error,
    );
    // Return neutral assessment on error
    return {
      trustScore: 65,
      assessment: 'Assessment unavailable',
      factors: {},
    };
  }
}

/**
 * Calculate trust score for instructor-created files (fast heuristic)
 */
function calculateTrustScoreFallback(
  sourceType: string,
  metadata?: Record<string, any>,
): number {
  // Instructor-created content gets good trust score
  if (sourceType === 'instructor') {
    // Google Drive files get slightly higher trust (75)
    if (isGoogleDriveSource(metadata)) {
      return 75;
    }
    // Local uploaded files get good trust (70)
    if (isLocalFileSource(metadata)) {
      return 70;
    }
    // Pasted text gets moderate trust (65)
    if (metadata?.type === 'pasted') {
      return 65;
    }
    // Default instructor content
    return 75;
  }

  // Other types (if explicitly set)
  if (sourceType === 'official') return 90;
  if (sourceType === 'tutorial') return 60;
  if (sourceType === 'ai_generated') return 50;
  if (sourceType === 'unverified') return 40;

  return 75; // Default
}

/**
 * Automatically determine source reliability metadata
 * Uses Gemini 2.0 Flash Lite for intelligent assessment (when content is available)
 * Falls back to heuristics for local/Google Drive files
 */
export async function autoDetectSourceMetadata(options: {
  sourceUrl?: string | null;
  title?: string;
  contentPreview?: string;
  type?: string;
  metadata?: Record<string, any>;
  useGeminiAssessment?: boolean; // Optional flag to enable Gemini assessment
}): Promise<Record<string, any>> {
  const {
    metadata: existingMetadata = {},
    useGeminiAssessment = true, // Default to enabled
  } = options;

  // Detect source type (defaults to 'instructor' for local/Drive files)
  const detectedSourceType = detectSourceType(
    existingMetadata,
    options.sourceUrl,
  );

  // Instructor-created files are not verified by default
  // (they can be marked as verified in metadata if needed)
  const isVerified = existingMetadata.isVerified ?? false;

  let trustScore: number;
  let geminiAssessment: Record<string, any> = {};

  // Use Gemini for intelligent assessment if content preview is available
  if (
    useGeminiAssessment &&
    options.contentPreview &&
    options.contentPreview.length > 50
  ) {
    try {
      const result = await assessContentReliabilityWithGemini(
        options.title || 'Untitled',
        options.contentPreview,
        existingMetadata,
      );

      trustScore = result.trustScore;
      geminiAssessment = {
        geminiAssessment: result.assessment,
        geminiFactors: result.factors,
      };

      console.log(
        `[Source Reliability] Gemini assessment for "${options.title}": score=${trustScore}`,
      );
    } catch (error) {
      console.warn(
        'Gemini assessment failed, falling back to heuristics:',
        error,
      );
      trustScore = calculateTrustScoreFallback(
        detectedSourceType,
        existingMetadata,
      );
    }
  } else {
    // Fall back to fast heuristic-based scoring
    trustScore = calculateTrustScoreFallback(
      detectedSourceType,
      existingMetadata,
    );
  }

  // Merge with existing metadata (preserve technical metadata like fileName, driveId, etc.)
  return {
    ...existingMetadata,
    sourceType: detectedSourceType,
    isVerified,
    trustScore,
    ...geminiAssessment,
    // Version defaults to 1 (versioning is handled per-topic in embed route)
    version: existingMetadata.version ?? 1,
  };
}

/**
 * Alternative function for fast heuristic-only assessment (no Gemini)
 * Use this when you want deterministic, instant results without API calls
 */
export function autoDetectSourceMetadataFast(options: {
  sourceUrl?: string | null;
  title?: string;
  type?: string;
  metadata?: Record<string, any>;
}): Record<string, any> {
  const { metadata: existingMetadata = {} } = options;

  const detectedSourceType = detectSourceType(
    existingMetadata,
    options.sourceUrl,
  );
  const isVerified = existingMetadata.isVerified ?? false;
  const trustScore = calculateTrustScoreFallback(
    detectedSourceType,
    existingMetadata,
  );

  return {
    ...existingMetadata,
    sourceType: detectedSourceType,
    isVerified,
    trustScore,
    version: existingMetadata.version ?? 1,
  };
}
