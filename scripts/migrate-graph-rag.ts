import 'dotenv/config';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error('❌ POSTGRES_URL not found in environment');
    process.exit(1);
  }

  console.log('🔗 Connecting to PostgreSQL...');
  const sql = postgres(connectionString, { max: 1 });

  try {
    const migrationPath = path.join(
      process.cwd(),
      'migrations',
      'add_graph_rag_tables.sql',
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📝 Running Graph RAG migration...');

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      await sql.unsafe(statement);
    }

    console.log('✅ Graph RAG tables created successfully!');
    console.log('   - GraphEntity table');
    console.log('   - GraphRelation table');
    console.log('   - Indexes created');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
