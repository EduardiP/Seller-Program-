const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS partners (
      customer_id TEXT PRIMARY KEY,
      email TEXT,
      creator_name TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  console.log('Tabela partners eshte gati.');
}

module.exports = { pool, initDb };
