const { Client } = require('pg');
(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const r = await c.query(
    "SELECT conname FROM pg_constraint WHERE conrelid = 'locations'::regclass AND conname = 'locations_has_owner'"
  );
  console.log('locations_has_owner exists:', r.rows.length > 0);

  const r2 = await c.query("SELECT filename FROM schema_migrations ORDER BY id");
  console.log('migrations recorded:');
  for (const row of r2.rows) console.log('  ' + row.filename);

  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
