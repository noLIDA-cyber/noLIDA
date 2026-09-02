const { Pool } = require('pg');
require('dotenv').config();

const isLocalDatabase = (process.env.DATABASE_URL || '').includes('localhost') ||
                        (process.env.DATABASE_URL || '').includes('127.0.0.1');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected database error', err);
});

const testConnection = async () => {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('Database connection established');
  } finally {
    client.release();
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  getClient: () => pool.connect(),
  testConnection,
};