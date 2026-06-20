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

  await pool.query(`
    ALTER TABLE partners
      ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false;
  `);
  await pool.query(`
    ALTER TABLE partners
      ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
  `);

  console.log('Tabela partners eshte gati.');
}

module.exports = { pool, initDb };
