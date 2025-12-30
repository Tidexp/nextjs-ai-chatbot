/**
 * DEBUG ENDPOINT: Compare weights across multiple sources
 * GET /api/rag/debug/weight-comparison?sourceIds=src1,src2,src3
 *
 * Shows weight statistics and distribution across sources
 */

import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { graphRelation, instructorSource } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
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
    const sourceIdsParam = searchParams.get('sourceIds');

    if (!sourceIdsParam) {
      return NextResponse.json(
        { error: 'Missing sourceIds parameter (comma-separated)' },
        { status: 400 },
      );
    }

    const sourceIds = sourceIdsParam.split(',').filter(Boolean);

    if (sourceIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid source IDs provided' },
        { status: 400 },
      );
    }

    // Get all sources
    const sources = await db
      .select()
      .from(instructorSource)
      .where(inArray(instructorSource.id, sourceIds));

    // Verify user owns all sources
    for (const source of sources) {
      if (source.userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get all relations for these sources
    const relations = await db
      .select()
      .from(graphRelation)
      .where(inArray(graphRelation.sourceId, sourceIds));

    // Group relations by source
    const relationsBySource = new Map<string, any[]>();
    for (const rel of relations) {
      const sourceId = (rel as any).sourceId;
      if (!relationsBySource.has(sourceId)) {
        relationsBySource.set(sourceId, []);
      }
      // biome-ignore lint: Forbidden non-null assertion.
      relationsBySource.get(sourceId)!.push(rel);
    }

    // Calculate statistics for each source
    const sourceStats = sources.map((source) => {
      const sourceRelations = relationsBySource.get(source.id) || [];
      const weights = sourceRelations.map((r: any) => Number(r.weight));

      const metadata = (source.metadata as any) || {};

      // Sort by relationship type
      const relationsByType = new Map<string, any[]>();
      for (const rel of sourceRelations) {
        const type = (rel as any).relationType;
        if (!relationsByType.has(type)) {
          relationsByType.set(type, []);
        }
        // biome-ignore lint: Forbidden non-null assertion.
        relationsByType.get(type)!.push(rel);
      }

      return {
        sourceId: source.id,
        title: source.title,
        trustScore: metadata.trustScore || 70,
        sourceType: metadata.sourceType,
        version: metadata.version || 1,
        createdAt: source.createdAt,
        relationCount: sourceRelations.length,
        weightStats: {
          min: weights.length > 0 ? Math.min(...weights).toFixed(4) : '0',
          max: weights.length > 0 ? Math.max(...weights).toFixed(4) : '0',
          avg:
            weights.length > 0
              ? (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(4)
              : '0',
          sum:
            weights.length > 0
              ? weights.reduce((a, b) => a + b, 0).toFixed(4)
              : '0',
        },
        relationsByType: Array.from(relationsByType.entries()).map(
          ([type, rels]) => ({
            type,
            count: rels.length,
            avgWeight: (
              rels.reduce((sum: number, r: any) => sum + Number(r.weight), 0) /
              rels.length
            ).toFixed(4),
          }),
        ),
      };
    });

    // Overall statistics
    const allWeights = relations.map((r: any) => Number(r.weight));
    const overallStats = {
      totalSources: sources.length,
      totalRelations: relations.length,
      weightDistribution: {
        min: allWeights.length > 0 ? Math.min(...allWeights).toFixed(4) : '0',
        max: allWeights.length > 0 ? Math.max(...allWeights).toFixed(4) : '0',
        avg:
          allWeights.length > 0
            ? (
                allWeights.reduce((a, b) => a + b, 0) / allWeights.length
              ).toFixed(4)
            : '0',
        median:
          allWeights.length > 0
            ? allWeights
                .sort((a, b) => a - b)
                [Math.floor(allWeights.length / 2)].toFixed(4)
            : '0',
        stdDev: calculateStdDev(allWeights),
      },
    };

    // Relationship type distribution
    const relationTypeCounts = new Map<string, number>();
    for (const rel of relations) {
      const type = (rel as any).relationType;
      relationTypeCounts.set(type, (relationTypeCounts.get(type) || 0) + 1);
    }

    // Temporal analysis
    const now = new Date();
    const decayAnalysis = sourceStats.map((stat) => {
      const createdAt = new Date(stat.createdAt);
      const ageMs = now.getTime() - createdAt.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const decayFactor = Math.exp(-0.01 * ageDays);

      const baseWeightNum = Number(stat.weightStats.avg);
      const decayedWeight = baseWeightNum * decayFactor;

      return {
        sourceId: stat.sourceId,
        title: stat.title,
        ageDays: Math.round(ageDays * 100) / 100,
        decayFactor: decayFactor.toFixed(6),
        baseWeightAvg: stat.weightStats.avg,
        decayedWeightAvg: decayedWeight.toFixed(4),
        weightLoss: ((1 - decayFactor) * 100).toFixed(1),
      };
    });

    return NextResponse.json({
      overallStats,
      sources: sourceStats.sort(
        (a, b) => Number(b.weightStats.sum) - Number(a.weightStats.sum),
      ),
      relationTypeDistribution: Array.from(relationTypeCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      temporalAnalysis: decayAnalysis,
      comparison: {
        highest_avg_weight_source: sourceStats.reduce((max, curr) =>
          Number(curr.weightStats.avg) > Number(max.weightStats.avg)
            ? curr
            : max,
        ),
        most_relations_source: sourceStats.reduce((max, curr) =>
          curr.relationCount > max.relationCount ? curr : max,
        ),
        newest_source: sourceStats.reduce((latest, curr) =>
          new Date(curr.createdAt) > new Date(latest.createdAt) ? curr : latest,
        ),
      },
      recommendations: {
        weight_variation: `Weights range from ${overallStats.weightDistribution.min} to ${overallStats.weightDistribution.max}. Standard deviation: ${overallStats.weightDistribution.stdDev}. ${Number(overallStats.weightDistribution.stdDev) > 0.2 ? 'High variation suggests diverse relationship types.' : 'Low variation suggests uniform relationship types.'}`,
        decay_impact:
          'Temporal decay reduces weight by 1% per day. Oldest content loses most impact over time.',
        source_reliability:
          'Compare weightStats across sources to see impact of trustScore variation.',
      },
    });
  } catch (error) {
    console.error('[Weight Comparison] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to compare weights';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function calculateStdDev(values: number[]): string {
  if (values.length === 0) return '0';

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
    values.length;
  const stdDev = Math.sqrt(variance);

  return stdDev.toFixed(4);
}
