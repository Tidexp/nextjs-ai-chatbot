import postgres from 'postgres';
import 'dotenv/config';

// biome-ignore lint/style/noNonNullAssertion: <explanation>
const sql = postgres(process.env.POSTGRES_URL!);

async function checkTables() {
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('InstructorSource', 'DocumentChunk')
      ORDER BY table_name
    `;

    console.log('✅ RAG Tables found:');
    tables.forEach((t) => console.log(`  - ${t.table_name}`));

    // Check DocumentChunk columns
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'DocumentChunk'
      ORDER BY ordinal_position
    `;

    console.log('\n📋 DocumentChunk columns:');
    columns.forEach((c) => console.log(`  - ${c.column_name}: ${c.data_type}`));
  } catch (error) {
    console.error('❌ Error checking tables:', error);
  } finally {
    await sql.end();
  }
}

checkTables();
