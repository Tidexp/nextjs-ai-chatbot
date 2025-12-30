/**
 * DEBUG ENDPOINT: Weight calculation breakdown
 * GET /api/rag/debug/weight-formula?sourceId=xxx
 *
 * Shows the weight calculation formula with actual values
 */

import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { graphRelation, instructorSource } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Weight lookup tables (must match lib/rag/db.ts)
const SEMANTIC_WEIGHTS: Record<string, number> = {
  // Programming domain (strong relationships)
  defines: 1.0,
  implements: 0.9,
  extends: 0.85,
  imports: 0.8,
  uses: 0.75,
  contains: 0.7,
  references: 0.6,

  // Educational domain
  prerequisite_of: 0.9,
  explains: 0.8,
  follows: 0.7,

  // General
  relates_to: 0.3,
  co_occurs: 0.2,
};

// Source reliability weights (based on trustScore 0-100)
function getSourceReliabilityWeight(trustScore: number): number {
  // Normalize trustScore (0-100) to reliability multiplier (0.5-1.0)
  return Math.min(1.0, 0.5 + trustScore / 200);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');

    if (!sourceId) {
      return NextResponse.json(
        { error: 'Missing sourceId parameter' },
        { status: 400 },
      );
    }

    // Get source
    const sources = await db
      .select()
      .from(instructorSource)
      .where(eq(instructorSource.id, sourceId))
      .limit(1);

    if (sources.length === 0) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const source = sources[0];

    // Verify ownership
    if (source.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const metadata = (source.metadata as any) || {};
    const trustScore = metadata.trustScore || 70;
    const version = metadata.version || 1;
    const isLatestVersion = true; // Assuming it's latest for this demo

    // Get sample relation to show calculation
    const relations = await db
      .select()
      .from(graphRelation)
      .where(eq(graphRelation.sourceId, sourceId))
      .limit(1);

    const sampleRelation = relations[0];

    const relationTypes = Object.keys(SEMANTIC_WEIGHTS);
    const semanticWeight =
      SEMANTIC_WEIGHTS[sampleRelation?.relationType || 'relates_to'] || 0.3;
    const sourceReliabilityWeight = getSourceReliabilityWeight(trustScore);
    const versioningBoost = isLatestVersion ? 1.2 : 0.8;

    const baseWeight =
      semanticWeight * sourceReliabilityWeight * versioningBoost;

    // Calculate decay examples
    const now = new Date();
    const decayExamples = [
      { days: 0, label: 'Just uploaded' },
      { days: 1, label: '1 day ago' },
      { days: 7, label: '1 week ago' },
      { days: 30, label: '1 month ago' },
      { days: 90, label: '3 months ago' },
    ];

    const decayedWeights = decayExamples.map((ex) => {
      const decayFactor = Math.exp(-0.01 * ex.days);
      return {
        ...ex,
        decayFactor: decayFactor.toFixed(6),
        weight: (baseWeight * decayFactor).toFixed(4),
        percentOfOriginal: (decayFactor * 100).toFixed(1),
      };
    });

    return NextResponse.json({
      sourceMetadata: {
        title: source.title,
        trustScore,
        sourceType: metadata.sourceType,
        isVerified: metadata.isVerified,
        version,
        isLatestVersion,
      },

      weightCalculation: {
        formula:
          'baseWeight = semanticWeight × sourceReliability × versioningBoost',

        components: {
          semanticWeight: {
            value: semanticWeight.toFixed(4),
            explanation: `Relationship type weight (${sampleRelation?.relationType || 'relates_to'})`,
            reference: semanticWeightExplanation(),
          },

          sourceReliability: {
            formula: '0.5 + trustScore / 200',
            trustScore,
            value: sourceReliabilityWeight.toFixed(4),
            explanation:
              'Normalized from trustScore (0-100) to multiplier (0.5-1.0)',
          },

          versioningBoost: {
            formula: 'isLatestVersion ? 1.2 : 0.8',
            isLatestVersion,
            value: versioningBoost.toFixed(4),
            explanation:
              'Latest version gets 1.2x boost, older versions get 0.8x to encourage using latest content',
          },

          baseWeight: {
            formula: `${semanticWeight.toFixed(4)} × ${sourceReliabilityWeight.toFixed(4)} × ${versioningBoost.toFixed(4)}`,
            value: baseWeight.toFixed(4),
            explanation:
              'Stored in database at write-time (constant for relation)',
          },
        },

        temporalDecay: {
          formula: 'decayedWeight = baseWeight × exp(-0.01 × days)',
          explanation:
            'Applied at read-time to prevent stale relations from inflating scores',
          decayRate: '1% per day (loses 1% of original weight per day)',
          baseWeight: baseWeight.toFixed(4),
          examples: decayedWeights,
        },
      },

      relationshipTypes: {
        programming: {
          defines: '1.0 - X defines/declares Y (strongest)',
          implements: '0.9 - X implements Y',
          extends: '0.85 - X extends/inherits Y',
          imports: '0.8 - X imports/uses Y',
          uses: '0.75 - X uses Y as tool',
          contains: '0.7 - X contains Y',
          references: '0.6 - X references Y',
        },
        educational: {
          prerequisite_of: '0.9 - X is prerequisite of Y',
          explains: '0.8 - X explains Y',
          follows: '0.7 - X follows Y in sequence',
        },
        general: {
          relates_to: '0.3 - General semantic relationship',
          co_occurs: '0.2 - X and Y appear together',
        },
      },

      trustScoreExamples: [
        {
          source: 'Instructor-uploaded (Google Drive)',
          trustScore: 75,
          reliability: getSourceReliabilityWeight(75).toFixed(4),
        },
        {
          source: 'Instructor-uploaded (Local file)',
          trustScore: 70,
          reliability: getSourceReliabilityWeight(70).toFixed(4),
        },
        {
          source: 'Pasted text',
          trustScore: 65,
          reliability: getSourceReliabilityWeight(65).toFixed(4),
        },
        {
          source: 'Official source',
          trustScore: 90,
          reliability: getSourceReliabilityWeight(90).toFixed(4),
        },
        {
          source: 'AI-generated content',
          trustScore: 50,
          reliability: getSourceReliabilityWeight(50).toFixed(4),
        },
      ],

      recommendations: {
        testing:
          'Use /api/rag/debug/graph-inspect?sourceId=xxx to see actual weights stored',
        optimization:
          'Adjust semantic weights in getSemanticWeight() if relationships need different priorities',
        tuning:
          'Adjust decay rate (currently -0.01 per day) or versioning boost (currently 1.2/0.8) as needed',
      },
    });
  } catch (error) {
    console.error('[Weight Debug] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to calculate weights';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function semanticWeightExplanation(): Record<string, string> {
  return {
    'defines-implements-extends':
      'Strongest (0.85-1.0): Direct structural/definitional relationships',
    'imports-uses-contains':
      'Medium (0.7-0.8): Dependency/composition relationships',
    'references-explains-follows':
      'Medium-low (0.6-0.8): Indirect relationships or explanatory links',
    'relates_to-co_occurs':
      'Weakest (0.2-0.3): General mentions or temporal co-occurrence',
  };
}
