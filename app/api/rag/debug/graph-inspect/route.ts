/**
 * DEBUG ENDPOINT: Inspect graph entities, relations, and weights
 * GET /api/rag/debug/graph-inspect?sourceId=xxx
 *
 * Shows:
 * - All entities extracted from source
 * - All relations with weights
 * - Weight calculation breakdown
 * - Temporal decay simulation
 */

import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { graphEntity, graphRelation, instructorSource } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

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

    // Get source details
    const sources = await db
      .select()
      .from(instructorSource)
      .where(eq(instructorSource.id, sourceId))
      .limit(1);

    if (sources.length === 0) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const source = sources[0];

    // Verify user owns this source
    if (source.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all entities for this source
    const entities = await db
      .select()
      .from(graphEntity)
      .where(eq(graphEntity.sourceId, sourceId));

    // Get all relations for this source
    const relations = await db
      .select()
      .from(graphRelation)
      .where(eq(graphRelation.sourceId, sourceId));

    // Build entity label map for display
    const entityMap = new Map<string, any>();
    for (const entity of entities) {
      entityMap.set((entity as any).id, {
        id: (entity as any).id,
        label: (entity as any).label,
        type: (entity as any).type,
      });
    }

    // Calculate temporal decay for each relation
    const now = new Date();
    const relationsWithDecay = relations.map((rel: any) => {
      const createdAt = new Date(rel.createdAt || source.createdAt);
      const ageMs = now.getTime() - createdAt.getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      // Temporal decay formula: weight * exp(-0.01 * days)
      // Decays by 1% per day
      const decayFactor = Math.exp(-0.01 * ageDays);
      const decayedWeight = rel.weight * decayFactor;

      return {
        from: entityMap.get(rel.fromEntityId),
        to: entityMap.get(rel.toEntityId),
        relationType: rel.relationType,
        baseWeight: Number(rel.weight).toFixed(4),
        decayFactor: decayFactor.toFixed(6),
        decayedWeight: decayedWeight.toFixed(4),
        createdAt: rel.createdAt || source.createdAt,
        ageHours: Math.round(ageHours),
        ageDays: Math.round(ageDays * 100) / 100,
      };
    });

    // Weight statistics
    const baseWeights = relations.map((r: any) => Number(r.weight));
    const avgBaseWeight =
      baseWeights.length > 0
        ? (baseWeights.reduce((a, b) => a + b, 0) / baseWeights.length).toFixed(
            4,
          )
        : '0';

    const decayedWeights = relationsWithDecay.map((r) =>
      Number(r.decayedWeight),
    );
    const avgDecayedWeight =
      decayedWeights.length > 0
        ? (
            decayedWeights.reduce((a, b) => a + b, 0) / decayedWeights.length
          ).toFixed(4)
        : '0';

    // Source metadata
    const sourceMetadata = (source.metadata as any) || {};

    return NextResponse.json({
      source: {
        id: source.id,
        title: source.title,
        type: source.type,
        createdAt: source.createdAt,
        metadata: {
          sourceType: sourceMetadata.sourceType,
          trustScore: sourceMetadata.trustScore,
          isVerified: sourceMetadata.isVerified,
          version: sourceMetadata.version,
          geminiAssessment: sourceMetadata.geminiAssessment,
          geminiFactors: sourceMetadata.geminiFactors,
        },
      },
      statistics: {
        entityCount: entities.length,
        relationCount: relations.length,
        averageBaseWeight: avgBaseWeight,
        averageDecayedWeight: avgDecayedWeight,
        testInfo: 'Decay: 1% per day, Formula: weight * exp(-0.01 * days)',
      },
      entities: entities.map((e: any) => ({
        id: e.id,
        label: e.label,
        type: e.type,
        canonicalLabel: e.canonicalLabel,
      })),
      relations: relationsWithDecay.sort(
        (a, b) => Number(b.baseWeight) - Number(a.baseWeight),
      ),
      explanations: {
        baseWeight:
          'Calculated at write-time: semanticWeight × sourceReliability × versioningBoost',
        semanticWeight:
          'Higher for stronger relationship types (defines=1.0, implements=0.9, relates_to=0.3, etc.)',
        sourceReliability:
          'Based on trustScore (0-100): instructor=0.7-0.9, official=0.95, ai_generated=0.5',
        versioningBoost:
          'Latest version=1.2, older versions=0.8 (encourages latest content)',
        decay:
          'Applied at read-time: decayedWeight = baseWeight × exp(-0.01 × days). Prevents stale relations from inflating scores.',
        recommendation:
          'Use baseWeight for storage efficiency, apply decay when ranking/scoring results',
      },
    });
  } catch (error) {
    console.error('[Graph Debug] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to inspect graph';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
