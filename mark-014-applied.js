const { Client } = require('pg');
(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  await c.query(
    "INSERT INTO schema_migrations (filename) VALUES ('014_add_integrity_constraints.sql') ON CONFLICT (filename) DO NOTHING"
  );
  const r = await c.query("SELECT filename FROM schema_migrations WHERE filename = '014_add_integrity_constraints.sql'");
  console.log('Recorded:', r.rows.length > 0);
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
