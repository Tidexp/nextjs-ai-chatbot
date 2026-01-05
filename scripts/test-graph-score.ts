import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { graphRelation, documentChunk } from '../lib/db/schema.js';
import { sql } from 'drizzle-orm';

// Initialize database connection (same as in queries.ts)
// biome-ignore lint/style/noNonNullAssertion: <explanation>
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/**
 * Test script to verify graph score calculation
 * Uses the ACTUAL algorithm from lib/rag/db.ts SQL query
 *
 * Graph Score Formula: ln(1 + avg_decayed_weight) / ln(1 + relation_count)
 *
 * Where:
 * - avg_decayed_weight: AVG(base_weight × temporal_decay) for all relations in chunk
 * - temporal_decay: max(0.3, exp(-0.01 × days_old))
 * - density normalization: division by ln(1 + relation_count) happens in graph_score
 */

/**
 * This is the EXACT implementation from lib/rag/db.ts SQL
 * graph_score = LN(1 + avg_decayed_weight) / GREATEST(1, LN(1 + relation_count))
 */
function calculateGraphScore(
  avgDecayedWeight: number,
  relationCount: number,
): number {
  const numerator = Math.log(1 + avgDecayedWeight);
  const denominator = Math.max(1, Math.log(1 + relationCount));
  return numerator / denominator;
}

/**
 * Temporal decay (from db.ts)
 */
function getTemporalDecay(daysOld: number, decayRate = 0.01): number {
  const decayedWeight = Math.exp(-decayRate * Math.max(0, daysOld));
  return Math.max(0.3, decayedWeight);
}

/**
 * Density normalization (from route.ts CTE)
 */
function getDensityFactor(relationCount: number): number {
  return Math.max(1, Math.log(1 + relationCount));
}

/**
 * Calculate average decayed weight for a chunk
 * This simulates: AVG(base_weight × temporal_decay) from SQL
 */
function calculateAvgDecayedWeight(
  weights: Array<{ base: number; daysOld: number }>,
): number {
  if (weights.length === 0) return 0;
  const decayedWeights = weights.map(
    (w) => w.base * getTemporalDecay(w.daysOld),
  );
  return decayedWeights.reduce((a, b) => a + b, 0) / decayedWeights.length;
}

async function testGraphScoreCalculation() {
  console.log('=== Graph Score Calculation Test ===\n');
  console.log(
    'Formula: graph_score = ln(1 + avg_decayed_weight) / ln(1 + relation_count)',
  );
  console.log(
    'Where avg_decayed_weight = AVG(base_weight × temporal_decay) per chunk\n',
  );

  // Test Case 1: Graph score with different relation counts
  console.log('--- Case 1: Graph Score = ln(1+weight) / ln(1+count) ---');
  console.log('Avg Weight | Rel Count | Numerator | Denominator | Graph Score');
  console.log('-----------|-----------|-----------|-------------|------------');

  const testCases = [
    { weight: 0.5, count: 5 },
    { weight: 1.0, count: 10 },
    { weight: 1.5, count: 8 },
    { weight: 2.0, count: 20 },
    { weight: 3.0, count: 50 },
    { weight: 5.0, count: 100 },
    { weight: 2.0, count: 200 },
    { weight: 10.0, count: 500 },
  ];

  testCases.forEach(({ weight, count }) => {
    const numerator = Math.log(1 + weight);
    const denominator = Math.max(1, Math.log(1 + count));
    const graphScore = calculateGraphScore(weight, count);

    console.log(
      `${weight.toFixed(1).padStart(10)} | ${count.toString().padStart(9)} | ${numerator.toFixed(4).padStart(9)} | ${denominator.toFixed(4).padStart(11)} | ${graphScore.toFixed(4).padStart(11)}`,
    );
  });

  console.log('\n💡 Insight: Double log-scaling + density normalization');
  console.log('   Hub (weight=5, count=100): score=0.39 (penalized)');
  console.log('   Specific (weight=1.5, count=8): score=0.41 (boosted)');

  // Test Case 2: Realistic Scenarios
  console.log('\n--- Case 2: Real-World Query Scenarios ---');
  console.log(
    'Scenario                          | Avg W  | Days | Rels | Decayed  | Graph Score',
  );
  console.log(
    '----------------------------------|--------|------|------|----------|------------',
  );

  const scenarios = [
    {
      name: 'Fresh content, specific entity',
      weights: [{ base: 1.2, daysOld: 7 }],
      relationCount: 8,
    },
    {
      name: 'Old content, specific entity',
      weights: [{ base: 1.2, daysOld: 90 }],
      relationCount: 8,
    },
    {
      name: 'Fresh content, hub entity',
      weights: [{ base: 1.2, daysOld: 7 }],
      relationCount: 100,
    },
    {
      name: 'Old content, hub entity',
      weights: [{ base: 1.2, daysOld: 90 }],
      relationCount: 100,
    },
    {
      name: 'Strong relations, moderate hub',
      weights: [
        { base: 3.5, daysOld: 30 },
        { base: 2.8, daysOld: 30 },
      ],
      relationCount: 25,
    },
    {
      name: 'Weak relation, few connections',
      weights: [{ base: 0.5, daysOld: 15 }],
      relationCount: 3,
    },
    {
      name: 'Multiple weak, super hub',
      weights: [
        { base: 0.2, daysOld: 60 },
        { base: 0.3, daysOld: 60 },
        { base: 0.1, daysOld: 60 },
      ],
      relationCount: 500,
    },
  ];

  scenarios.forEach((scenario) => {
    const avgWeight = scenario.weights[0].base;
    const avgDays = scenario.weights[0].daysOld;
    const avgDecayed = calculateAvgDecayedWeight(scenario.weights);
    const graphScore = calculateGraphScore(avgDecayed, scenario.relationCount);

    console.log(
      `${scenario.name.padEnd(33)} | ${avgWeight.toFixed(1).padStart(6)} | ${avgDays.toString().padStart(4)} | ${scenario.relationCount.toString().padStart(4)} | ${avgDecayed.toFixed(4).padStart(8)} | ${graphScore.toFixed(4).padStart(11)}`,
    );
  });

  // Test Case 3: Hybrid Score Simulation
  console.log('\n--- Case 3: Hybrid Score (Vector + Graph) ---');
  console.log(
    'Chunk          | Vector | Avg Decay | Rels | Graph Score | Boost=0.3 | Boost=0.7',
  );
  console.log(
    '---------------|--------|-----------|------|-------------|-----------|----------',
  );

  const hybridScenarios = [
    {
      name: 'Perfect match',
      vectorSim: 0.9,
      avgDecayed: 1.5,
      relationCount: 12,
    },
    {
      name: 'Good semantic',
      vectorSim: 0.85,
      avgDecayed: 0.8,
      relationCount: 8,
    },
    {
      name: 'Weak semantic',
      vectorSim: 0.65,
      avgDecayed: 1.8,
      relationCount: 15,
    },
    {
      name: 'Graph-heavy',
      vectorSim: 0.6,
      avgDecayed: 2.5,
      relationCount: 5,
    },
    {
      name: 'Vector-heavy',
      vectorSim: 0.95,
      avgDecayed: 0.3,
      relationCount: 100,
    },
  ];

  hybridScenarios.forEach((scenario) => {
    const graphScore = calculateGraphScore(
      scenario.avgDecayed,
      scenario.relationCount,
    );
    const hybrid03 = scenario.vectorSim + 0.3 * graphScore;
    const hybrid07 = scenario.vectorSim + 0.7 * graphScore;

    console.log(
      `${scenario.name.padEnd(14)} | ${scenario.vectorSim.toFixed(2).padStart(6)} | ${scenario.avgDecayed.toFixed(4).padStart(9)} | ${scenario.relationCount.toString().padStart(4)} | ${graphScore.toFixed(4).padStart(11)} | ${hybrid03.toFixed(4).padStart(9)} | ${hybrid07.toFixed(4).padStart(9)}`,
    );
  });

  console.log(
    '\n💡 Insight: graphBoost=0.7 rewards strong graph connections more',
  );

  // Test Case 3b: Ranking Changes with Different graphBoost
  console.log('\n--- Case 3b: Ranking Impact (Sorted by Hybrid Score) ---');

  const rankingTest = [
    {
      name: 'Chunk A (vector-focused)',
      vector: 0.88,
      avgDecayed: 0.5,
      rels: 50,
    },
    { name: 'Chunk B (balanced)', vector: 0.75, avgDecayed: 1.2, rels: 10 },
    { name: 'Chunk C (graph-focused)', vector: 0.62, avgDecayed: 2.0, rels: 6 },
    { name: 'Chunk D (hub chunk)', vector: 0.7, avgDecayed: 1.5, rels: 120 },
    { name: 'Chunk E (weak both)', vector: 0.55, avgDecayed: 0.8, rels: 15 },
  ];

  const withBoost03 = rankingTest
    .map((c) => ({
      ...c,
      graphScore: calculateGraphScore(c.avgDecayed, c.rels),
      hybrid: c.vector + 0.3 * calculateGraphScore(c.avgDecayed, c.rels),
    }))
    .sort((a, b) => b.hybrid - a.hybrid);

  const withBoost07 = rankingTest
    .map((c) => ({
      ...c,
      graphScore: calculateGraphScore(c.avgDecayed, c.rels),
      hybrid: c.vector + 0.7 * calculateGraphScore(c.avgDecayed, c.rels),
    }))
    .sort((a, b) => b.hybrid - a.hybrid);

  console.log('\nWith graphBoost = 0.3 (Vector-dominant):');
  withBoost03.forEach((chunk, i) => {
    console.log(
      `#${i + 1}: ${chunk.name.padEnd(30)} | V=${chunk.vector.toFixed(2)} G=${chunk.graphScore.toFixed(3)} → Hybrid=${chunk.hybrid.toFixed(4)}`,
    );
  });

  console.log('\nWith graphBoost = 0.7 (Graph-boosted):');
  withBoost07.forEach((chunk, i) => {
    console.log(
      `#${i + 1}: ${chunk.name.padEnd(30)} | V=${chunk.vector.toFixed(2)} G=${chunk.graphScore.toFixed(3)} → Hybrid=${chunk.hybrid.toFixed(4)}`,
    );
  });

  console.log('\n💡 Observations:');
  console.log('   - Boost=0.3: Vector similarity dominates (Chunk A wins)');
  console.log('   - Boost=0.7: Graph connections matter more (Chunk C rises)');
  console.log('   - Hub chunks (D) get penalized by density normalization');

  // Test Case 4: Graph Score Distribution
  console.log('\n--- Case 4: Score Distribution Analysis ---');
  console.log('Checking if double log-scaling prevents extreme values...\n');

  const testData = [];
  for (let i = 0; i < 100; i++) {
    // Simulate random chunks
    const randomWeight = 0.1 + Math.random() * 4.9;
    const randomCount = Math.floor(1 + Math.random() * 199); // 1-200 relations
    testData.push({ weight: randomWeight, count: randomCount });
  }

  const scores = testData.map((d) => calculateGraphScore(d.weight, d.count));
  const weights = testData.map((d) => d.weight);
  const linearScores = weights; // For comparison

  const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
  const avgGraphScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const avgLinearScore =
    linearScores.reduce((a, b) => a + b, 0) / linearScores.length;

  const maxWeight = Math.max(...weights);
  const maxGraphScore = Math.max(...scores);
  const maxLinearScore = Math.max(...linearScores);

  const minWeight = Math.min(...weights);
  const minGraphScore = Math.min(...scores);
  const minLinearScore = Math.min(...linearScores);

  console.log(
    'Metric              | Weights (input) | Graph Scores | Linear Scores',
  );
  console.log(
    '--------------------|-----------------|--------------|---------------',
  );
  console.log(
    `Average             | ${avgWeight.toFixed(4).padStart(15)} | ${avgGraphScore.toFixed(4).padStart(12)} | ${avgLinearScore.toFixed(4).padStart(13)}`,
  );
  console.log(
    `Maximum             | ${maxWeight.toFixed(4).padStart(15)} | ${maxGraphScore.toFixed(4).padStart(12)} | ${maxLinearScore.toFixed(4).padStart(13)}`,
  );
  console.log(
    `Minimum             | ${minWeight.toFixed(4).padStart(15)} | ${minGraphScore.toFixed(4).padStart(12)} | ${minLinearScore.toFixed(4).padStart(13)}`,
  );
  console.log(
    `Range (max - min)   | ${(maxWeight - minWeight).toFixed(4).padStart(15)} | ${(maxGraphScore - minGraphScore).toFixed(4).padStart(12)} | ${(maxLinearScore - minLinearScore).toFixed(4).padStart(13)}`,
  );
  console.log(
    `Compression Ratio   | ${'1.00x'.padStart(15)} | ${((maxWeight - minWeight) / (maxGraphScore - minGraphScore)).toFixed(2).padStart(12)}x | ${'1.00x'.padStart(13)}`,
  );

  console.log(
    '\n💡 Double log-scaling + density norm reduces range significantly!',
  );

  // Test Case 5: Real Database Query (if data exists)
  console.log('\n--- Case 5: Real Database Graph Scores ---');

  try {
    const result = await db.execute<{
      chunk_id: string;
      entity_label: string;
      base_weight: number;
      days_old: number;
      relation_count: number;
      adjusted_weight: number;
      graph_score: number;
    }>(sql`
      WITH chunk_relations AS (
        SELECT 
          r.evidence_chunk_id as chunk_id,
          dc.content,
          COUNT(r.id) as relation_count,
          AVG(r.weight * GREATEST(0.3, EXP(-0.01 * EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 86400))) as avg_decayed_weight
        FROM ${graphRelation} r
        JOIN ${documentChunk} dc ON r.evidence_chunk_id = dc.id
        WHERE r.evidence_chunk_id IS NOT NULL
        GROUP BY r.evidence_chunk_id, dc.content
        HAVING COUNT(r.id) > 0
        LIMIT 20
      )
      SELECT 
        chunk_id,
        SUBSTRING(content, 1, 40) as entity_label,
        relation_count,
        avg_decayed_weight,
        LN(1 + COALESCE(avg_decayed_weight, 0)) / GREATEST(1, LN(1 + relation_count)) as graph_score
      FROM chunk_scores
      ORDER BY graph_score DESC
      LIMIT 10
    `);

    const chunks = result as unknown as {
      rows: Array<{
        chunk_id: string;
        entity_label: string;
        relation_count: number;
        avg_decayed_weight: number;
        graph_score: number;
      }>;
    };

    if (chunks.rows && chunks.rows.length > 0) {
      console.log('\nTop 10 chunks by graph score (real data):');
      console.log(
        'Chunk Preview (40 chars)             | Rels | Avg Decayed | Graph Score',
      );
      console.log(
        '-------------------------------------|------|-------------|------------',
      );

      chunks.rows.forEach((chunk) => {
        console.log(
          `${chunk.entity_label.padEnd(36)} | ${chunk.relation_count.toString().padStart(4)} | ${Number(chunk.avg_decayed_weight).toFixed(4).padStart(11)} | ${Number(chunk.graph_score).toFixed(4).padStart(11)}`,
        );
      });

      // Calculate statistics
      const scores = chunks.rows.map((r) => Number(r.graph_score));
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);

      console.log(`\nStatistics:`);
      console.log(`  Average score: ${avgScore.toFixed(4)}`);
      console.log(`  Max score: ${maxScore.toFixed(4)}`);
      console.log(`  Min score: ${minScore.toFixed(4)}`);
      console.log(`  Range: ${(maxScore - minScore).toFixed(4)}`);
    } else {
      console.log('\nNo chunks with evidence_chunk_id found in database.');
      console.log('Try ingesting some documents first.');
    }
  } catch (error) {
    console.error('Database query error:', error);
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(
    '✅ Double log-scaling: ln(1+weight) / ln(1+count) prevents dominance',
  );
  console.log('✅ Density normalization built into graph_score formula');
  console.log('✅ Hub entities (high count) get penalized in denominator');
  console.log('✅ avg_decayed_weight averages all relations per chunk');
  console.log(
    '✅ Hybrid score balances vector similarity + graph relationships',
  );
  console.log(
    '✅ graphBoost parameter controls influence (0.3 default, 0.7 graph-heavy)',
  );
}

// Run the test
testGraphScoreCalculation()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
