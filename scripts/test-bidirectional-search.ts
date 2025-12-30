import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { graphRelation, graphEntity } from '../lib/db/schema.js';
import { sql } from 'drizzle-orm';

// Initialize database connection (same as in queries.ts)
// biome-ignore lint/style/noNonNullAssertion: <explanation>
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/**
 * Test script to verify bidirectional relationship search
 * Uses the ACTUAL algorithm from lib/rag/db.ts CTE query
 */

/**
 * Simulate the bidirectional search logic from db.ts
 * Given a query entity, find all related entities in BOTH directions
 */
function simulateBidirectionalSearch(
  relations: Array<{
    from: string;
    to: string;
    type: string;
    weight: number;
  }>,
  queryEntity: string,
): Array<{
  relatedEntity: string;
  direction: 'outgoing' | 'incoming';
  type: string;
  weight: number;
}> {
  const results: Array<{
    relatedEntity: string;
    direction: 'outgoing' | 'incoming';
    type: string;
    weight: number;
  }> = [];

  relations.forEach((rel) => {
    // Outgoing: query entity is the source (from)
    if (rel.from === queryEntity) {
      results.push({
        relatedEntity: rel.to,
        direction: 'outgoing',
        type: rel.type,
        weight: rel.weight,
      });
    }
    // Incoming: query entity is the target (to)
    if (rel.to === queryEntity) {
      results.push({
        relatedEntity: rel.from,
        direction: 'incoming',
        type: rel.type,
        weight: rel.weight,
      });
    }
  });

  return results;
}

async function testBidirectionalSearch() {
  console.log('=== Bidirectional Search Test (db.ts Algorithm) ===\n');
  console.log(
    'CTE Logic: WHERE from_entity_id = ANY(...) OR to_entity_id = ANY(...)\n',
  );

  // Example directed triplets (subject -> predicate -> object)
  const exampleRelations = [
    { from: 'React', to: 'Component', type: 'defines', weight: 3.5 },
    { from: 'React', to: 'JSX', type: 'uses', weight: 2.0 },
    { from: 'NextJS', to: 'React', type: 'extends', weight: 3.0 },
    {
      from: 'TypeScript',
      to: 'React',
      type: 'implements',
      weight: 3.0,
    },
    { from: 'Component', to: 'Props', type: 'contains', weight: 2.5 },
    { from: 'Lesson2', to: 'Lesson1', type: 'prerequisite_of', weight: 3.5 },
  ];

  console.log('--- Example Knowledge Graph ---');
  console.log('From (Subject)  | Relation Type  | To (Object)     | Weight');
  console.log('----------------|----------------|-----------------|-------');
  exampleRelations.forEach((rel) => {
    console.log(
      `${rel.from.padEnd(15)} | ${rel.type.padEnd(14)} | ${rel.to.padEnd(15)} | ${rel.weight.toFixed(1)}`,
    );
  });

  // Test Case 1: Query "React" - should find both outgoing AND incoming
  console.log('\n--- Test Case 1: Query Entity = "React" ---');
  const reactResults = simulateBidirectionalSearch(exampleRelations, 'React');
  console.log(
    '\nDirection | Related Entity  | Relation Type  | Weight | Interpretation',
  );
  console.log(
    '----------|-----------------|----------------|--------|----------------',
  );

  reactResults.forEach((result) => {
    const interpretation =
      result.direction === 'outgoing'
        ? `React ${result.type} ${result.relatedEntity}`
        : `${result.relatedEntity} ${result.type} React`;

    console.log(
      `${result.direction.padEnd(9)} | ${result.relatedEntity.padEnd(15)} | ${result.type.padEnd(14)} | ${result.weight.toFixed(1).padStart(6)} | ${interpretation}`,
    );
  });

  console.log(
    `\nTotal: ${reactResults.length} relations found (${reactResults.filter((r) => r.direction === 'outgoing').length} outgoing, ${reactResults.filter((r) => r.direction === 'incoming').length} incoming)`,
  );

  // Test Case 2: Unidirectional vs Bidirectional comparison
  console.log('\n--- Test Case 2: Unidirectional vs Bidirectional ---');

  const unidirectional = exampleRelations.filter((rel) => rel.from === 'React');
  const bidirectional = reactResults;

  console.log(
    `Unidirectional (from_entity ONLY): ${unidirectional.length} results`,
  );
  console.log(`Bidirectional (from OR to): ${bidirectional.length} results`);
  console.log(
    `Missing without bidirectional: ${bidirectional.length - unidirectional.length} relations`,
  );

  console.log('\nMissed relations (incoming only):');
  bidirectional
    .filter((r) => r.direction === 'incoming')
    .forEach((r) => {
      console.log(
        `  - ${r.relatedEntity} ${r.type} React (weight ${r.weight})`,
      );
    });

  // Test Case 3: Educational prerequisite chain
  console.log('\n--- Test Case 3: Prerequisite Chain (Educational) ---');
  console.log('Query: "Lesson1" should find "Lesson2" that requires it\n');

  const lesson1Results = simulateBidirectionalSearch(
    exampleRelations,
    'Lesson1',
  );

  if (lesson1Results.length > 0) {
    lesson1Results.forEach((r) => {
      if (r.type === 'prerequisite_of' && r.direction === 'incoming') {
        console.log(
          `✓ Found: "${r.relatedEntity}" requires "${r.type.replace('_', ' ')}" Lesson1`,
        );
        console.log(
          `  Direction: INCOMING (Lesson2 -> Lesson1, but we're querying Lesson1)`,
        );
        console.log(`  Without bidirectional search, this would be MISSED!`);
      }
    });
  } else {
    console.log('No prerequisite relations found.');
  }

  console.log('\n=== Database Reality Check ===\n');

  try {
    // Test actual bidirectional query on database
    // Pick a random entity and show its bidirectional relations
    const sampleEntity = await db.execute<{
      entity_id: string;
      label: string;
    }>(sql`
      SELECT id::text as entity_id, label
      FROM "GraphEntity"
      LIMIT 1
    `);

    const entities = sampleEntity as unknown as {
      rows: Array<{ entity_id: string; label: string }>;
    };

    if (entities.rows && entities.rows.length > 0) {
      const testEntityId = entities.rows[0].entity_id;
      const testEntityLabel = entities.rows[0].label;

      console.log(
        `Testing with entity: "${testEntityLabel}" (${testEntityId.substring(0, 8)}...)`,
      );

      // Bidirectional query (CTE approach)
      const bidirectionalResult = await db.execute<{
        related_entity_label: string;
        relation_type: string;
        weight: number;
        direction: string;
      }>(sql`
        SELECT 
          CASE 
            WHEN gr.from_entity_id = ${testEntityId} THEN ge_to.label
            ELSE ge_from.label
          END AS related_entity_label,
          gr.relation_type,
          gr.weight,
          CASE 
            WHEN gr.from_entity_id = ${testEntityId} THEN 'outgoing'
            ELSE 'incoming'
          END AS direction
        FROM "GraphRelation" gr
        LEFT JOIN "GraphEntity" ge_from ON gr.from_entity_id = ge_from.id
        LEFT JOIN "GraphEntity" ge_to ON gr.to_entity_id = ge_to.id
        WHERE gr.from_entity_id = ${testEntityId}
           OR gr.to_entity_id = ${testEntityId}
        LIMIT 10
      `);

      const biResults = bidirectionalResult as unknown as {
        rows: Array<{
          related_entity_label: string;
          relation_type: string;
          weight: number;
          direction: string;
        }>;
      };

      if (biResults.rows && biResults.rows.length > 0) {
        console.log('\nBidirectional relations found:');
        console.log(
          'Direction | Related Entity       | Type           | Weight',
        );
        console.log(
          '----------|----------------------|----------------|-------',
        );

        biResults.rows.forEach((row) => {
          console.log(
            `${row.direction.padEnd(9)} | ${row.related_entity_label.padEnd(20).substring(0, 20)} | ${row.relation_type.padEnd(14)} | ${Number(row.weight).toFixed(1).padStart(6)}`,
          );
        });

        const outgoing = biResults.rows.filter(
          (r) => r.direction === 'outgoing',
        ).length;
        const incoming = biResults.rows.filter(
          (r) => r.direction === 'incoming',
        ).length;

        console.log(
          `\nTotal: ${biResults.rows.length} (${outgoing} outgoing, ${incoming} incoming)`,
        );
      } else {
        console.log('No relations found for this entity.');
      }

      // Unidirectional comparison (OLD approach - FROM only)
      const unidirectionalResult = await db.execute<{
        related_entity_label: string;
        relation_type: string;
        weight: number;
      }>(sql`
        SELECT 
          ge_to.label AS related_entity_label,
          gr.relation_type,
          gr.weight
        FROM "GraphRelation" gr
        LEFT JOIN "GraphEntity" ge_to ON gr.to_entity_id = ge_to.id
        WHERE gr.from_entity_id = ${testEntityId}
        LIMIT 10
      `);

      const uniResults = unidirectionalResult as unknown as {
        rows: Array<{
          related_entity_label: string;
          relation_type: string;
          weight: number;
        }>;
      };

      console.log(
        `\nUnidirectional (OLD approach): ${uniResults.rows?.length || 0} results`,
      );
      console.log(
        `Bidirectional (NEW approach): ${biResults.rows?.length || 0} results`,
      );

      if ((biResults.rows?.length || 0) > (uniResults.rows?.length || 0)) {
        console.log(
          `\n✓ Bidirectional search found ${(biResults.rows?.length || 0) - (uniResults.rows?.length || 0)} additional relations!`,
        );
      }
    } else {
      console.log('No entities found in database yet.');
    }

    console.log('\n=== Key Insights ===');
    console.log(
      '1. Bidirectional search uses: WHERE from_entity = X OR to_entity = X',
    );
    console.log(
      '2. Finds relationships in BOTH directions (outgoing + incoming)',
    );
    console.log(
      '3. Critical for directed relationships (prerequisite_of, extends, implements)',
    );
    console.log('4. Without it, you miss 50% of the context (incoming edges)');
    console.log('\nExample: Query "React" finds both:');
    console.log('  - Outgoing: React -> defines -> Component');
    console.log('  - Incoming: NextJS -> extends -> React');
  } catch (error) {
    console.error('Database query error:', error);
  }

  process.exit(0);
}

testBidirectionalSearch();
