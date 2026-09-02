const { Client } = require('pg');
require('dotenv').config();

(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const tables = ['users', 'user_auth_methods', 'profiles', 'organization_members', 'roles', 'permissions', 'role_permissions', 'schema_migrations', 'categories'];
  for (const t of tables) {
    try {
      const r = await c.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
      console.log(`${t.padEnd(25)} ${r.rows[0].n} rows`);
    } catch (e) {
      console.log(`${t.padEnd(25)} ERROR: ${e.message.split('\n')[0]}`);
    }
  }

  console.log('\n--- users ---');
  const u = await c.query('SELECT id, email, status, created_at FROM users ORDER BY id');
  for (const row of u.rows) console.log(JSON.stringify(row));

  console.log('\n--- user_auth_methods ---');
  const m = await c.query('SELECT user_id, provider, email, length(password_hash) AS hash_len, substring(password_hash, 1, 7) AS hash_prefix FROM user_auth_methods ORDER BY user_id');
  for (const row of m.rows) console.log(JSON.stringify(row));

  console.log('\n--- organization_members ---');
  const om = await c.query('SELECT user_id, organization_id, role_id, status FROM organization_members ORDER BY user_id, role_id');
  for (const row of om.rows) console.log(JSON.stringify(row));

  console.log('\n--- roles ---');
  const r = await c.query("SELECT id, name, slug, is_system FROM roles ORDER BY id");
  for (const row of r.rows) console.log(JSON.stringify(row));

  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
