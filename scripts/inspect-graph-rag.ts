import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const conn = process.env.POSTGRES_URL;
  if (!conn) {
    console.error('POSTGRES_URL is missing in .env');
    process.exit(1);
  }

  const sql = postgres(conn, { max: 1 });

  // Optional arg: sourceId
  const sourceIdArg = process.argv[2];

  try {
    let sources: Array<{ id: string; title: string; createdAt: string }>;
    if (sourceIdArg) {
      sources = await sql /* sql */`
        SELECT id, title, "createdAt"::text
        FROM "InstructorSource"
        WHERE id = ${sourceIdArg}
        LIMIT 1;
      `;
      if (sources.length === 0) {
        console.log('No source found for id:', sourceIdArg);
        return;
      }
    } else {
      sources = await sql /* sql */`
        SELECT id, title, "createdAt"::text
        FROM "InstructorSource"
        ORDER BY "createdAt" DESC
        LIMIT 5;
      `;
    }

    for (const s of sources) {
      console.log(`\nSource: ${s.title} (${s.id}) @ ${s.createdAt}`);

      const [chunkCount] = await sql /* sql */`
        SELECT COUNT(*)::int AS cnt FROM "DocumentChunk" WHERE "sourceId" = ${s.id};
      `;

      const [entitiesCount] = await sql /* sql */`
        SELECT COUNT(*)::int AS cnt FROM "GraphEntity" WHERE "sourceId" = ${s.id};
      `;
      const [relationsCount] = await sql /* sql */`
        SELECT COUNT(*)::int AS cnt FROM "GraphRelation" WHERE "sourceId" = ${s.id};
      `;

      console.log(
        `Chunks: ${chunkCount.cnt}, Entities: ${entitiesCount.cnt}, Relations: ${relationsCount.cnt}`,
      );

      const topEntities = await sql /* sql */`
        SELECT label, type, COUNT(*)::int AS freq
        FROM "GraphEntity"
        WHERE "sourceId" = ${s.id}
        GROUP BY label, type
        ORDER BY freq DESC, label ASC
        LIMIT 10;
      `;

      console.log('Top entities:');
      for (const e of topEntities) {
        console.log(`  - ${e.label} [${e.type}] x${e.freq}`);
      }

      const sampleEdges = await sql /* sql */`
        SELECT e1.label AS from_label, r."relationType", e2.label AS to_label
        FROM "GraphRelation" r
        JOIN "GraphEntity" e1 ON e1.id = r."fromEntityId"
        JOIN "GraphEntity" e2 ON e2.id = r."toEntityId"
        WHERE r."sourceId" = ${s.id}
        LIMIT 15;
      `;

      console.log('Sample relations:');
      if (sampleEdges.length === 0) {
        console.log('  (none)');
      } else {
        for (const r of sampleEdges) {
          console.log(
            `  - ${r.from_label} --${r.relationType}--> ${r.to_label}`,
          );
        }
      }
    }
  } catch (err) {
    console.error('Inspection failed:', err);
  }
}

main();
