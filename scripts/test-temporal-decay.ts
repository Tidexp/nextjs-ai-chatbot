import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { graphRelation } from '../lib/db/schema.js';
import { sql } from 'drizzle-orm';

// Initialize database connection (same as in queries.ts)
// biome-ignore lint/style/noNonNullAssertion: <explanation>
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/**
 * Test script to verify temporal decay implementation
 * Uses the ACTUAL algorithm from lib/rag/db.ts getTemporalDecay()
 */

// Decay parameters FROM db.ts (getTemporalDecay function)
const TEMPORAL_DECAY_RATE = 0.01; // λ = 0.01 (DEFAULT in db.ts)
const MIN_DECAY_FACTOR = 0.3;

/**
 * This is the EXACT implementation from lib/rag/db.ts
 */
function getTemporalDecay(createdAt: Date | string, decayRate = 0.01): number {
  const created =
    typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const now = new Date();
  const daysOld = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

  const decayedWeight = Math.exp(-decayRate * Math.max(0, daysOld));
  return Math.max(0.3, decayedWeight);
}

async function testTemporalDecay() {
  console.log('=== Temporal Decay Function Test (db.ts Algorithm) ===\n');
  console.log('Using decay rate λ = 0.01 (from lib/rag/db.ts)\n');

  // Show decay curve for various time periods
  console.log('Days Old | Decay Factor | Effective Weight (base=3.5)');
  console.log('---------|--------------|---------------------------');

  const testDays = [0, 1, 7, 14, 30, 60, 90, 180, 365, 730];
  testDays.forEach((days) => {
    // Simulate a date that old
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - days);

    const decay = getTemporalDecay(oldDate);
    const effectiveWeight = 3.5 * decay; // Example with semantic weight of 3.5
    console.log(
      `${days.toString().padStart(8)} | ${decay.toFixed(4).padStart(12)} | ${effectiveWeight.toFixed(4).padStart(25)}`,
    );
  });

  console.log('\n=== Database Reality Check ===\n');

  try {
    // Check actual relations in database with their ages
    // Using decay rate 0.01 (matching db.ts)
    const result = await db.execute<{
      relation_type: string;
      weight: number;
      days_old: number;
      decay_factor: number;
      effective_weight: number;
    }>(sql`
      SELECT 
        relation_type,
        weight,
        EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 AS days_old,
        GREATEST(0.3, EXP(-0.01 * EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400)) AS decay_factor,
        weight * GREATEST(0.3, EXP(-0.01 * EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400)) AS effective_weight
      FROM ${graphRelation}
      ORDER BY created_at DESC
      LIMIT 10
    `);

    const relations = result as unknown as {
      rows: Array<{
        relation_type: string;
        weight: number;
        days_old: number;
        decay_factor: number;
        effective_weight: number;
      }>;
    };

    if (relations.rows && relations.rows.length > 0) {
      console.log('Recent relations with temporal decay applied:');
      console.log(
        'Type          | Raw Weight | Days Old | Decay    | Effective',
      );
      console.log(
        '--------------|------------|----------|----------|----------',
      );

      relations.rows.forEach((rel) => {
        console.log(
          `${rel.relation_type.padEnd(13)} | ${rel.weight.toFixed(2).padStart(10)} | ${Number(rel.days_old).toFixed(1).padStart(8)} | ${Number(rel.decay_factor).toFixed(4).padStart(8)} | ${Number(rel.effective_weight).toFixed(4).padStart(8)}`,
        );
      });
    } else {
      console.log('No relations found in database yet.');
    }

    console.log('\n=== Decay Formula Analysis ===');
    console.log(`Formula: decay = max(0.3, e^(-λ × days))`);
    console.log(
      `Parameters: λ = ${TEMPORAL_DECAY_RATE}, min = ${MIN_DECAY_FACTOR}`,
    );
    console.log(
      `\nHalf-life: ${(Math.log(2) / TEMPORAL_DECAY_RATE).toFixed(1)} days`,
    );
    console.log(
      `Time to reach minimum (30%): ${(Math.log(MIN_DECAY_FACTOR / 1) / -TEMPORAL_DECAY_RATE).toFixed(1)} days`,
    );
    console.log(`\nInterpretation:`);
    console.log(`- Fresh content (0-14 days): 87-100% weight retention`);
    console.log(`- Recent content (14-60 days): 54-87% weight retention`);
    console.log(`- Moderate age (60-120 days): 30-54% weight retention`);
    console.log(`- Stale content (>120 days): 30% minimum weight (floor)`);
  } catch (error) {
    console.error('Database query error:', error);
  }

  process.exit(0);
}

testTemporalDecay();
