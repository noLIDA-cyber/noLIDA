const fs = require('fs');
const path = require('path');
const { query, testConnection } = require('../config/database');

const runMigrations = async () => {
  await testConnection();

  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const migrationsDir = path.join(__dirname, '../migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  const result = await query('SELECT filename FROM schema_migrations');
  const applied = new Set(result.rows.map(row => row.filename));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Skipping ${file} (already applied)`);
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`Running ${file}...`);
    await query(sql);
    await query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
    console.log(`Applied ${file}`);
  }

  console.log('Migrations complete');
  process.exit(0);
};

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});