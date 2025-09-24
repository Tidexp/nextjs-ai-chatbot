import postgres from 'postgres';

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error('POSTGRES_URL not set');
    process.exit(1);
  }
  const sql = postgres(url, { max: 1 });
  try {
    const rows = await sql/* sql */`
      SELECT
        con.conname as constraint_name,
        rel_tgt.relname as target_table,
        rel_src.relname as source_table,
        att_src.attname as source_column,
        att_tgt.attname as target_column
      FROM pg_constraint con
      JOIN pg_class rel_src ON rel_src.oid = con.conrelid
      JOIN pg_class rel_tgt ON rel_tgt.oid = con.confrelid
      JOIN pg_namespace nsp_src ON nsp_src.oid = rel_src.relnamespace
      JOIN pg_namespace nsp_tgt ON nsp_tgt.oid = rel_tgt.relnamespace
      JOIN LATERAL (
        SELECT attname FROM pg_attribute
        WHERE attrelid = con.conrelid AND attnum = ANY(con.conkey)
      ) att_src ON TRUE
      JOIN LATERAL (
        SELECT attname FROM pg_attribute
        WHERE attrelid = con.confrelid AND attnum = ANY(con.confkey)
      ) att_tgt ON TRUE
      WHERE con.contype = 'f'
        AND rel_src.relname = 'ResponseFeedback'
        AND att_src.attname = 'messageId';
    `;
    console.log(rows);
  } finally {
    await sql.end({ timeout: 1 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


