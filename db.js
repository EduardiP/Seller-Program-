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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      customer_id TEXT NOT NULL,
      printify_product_id TEXT NOT NULL,
      title TEXT,
      blueprint_id INTEGER,
      preview_url TEXT,
      published BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS designs (
      id SERIAL PRIMARY KEY,
      image_url TEXT NOT NULL,
      caption TEXT,
      caption_sq TEXT,
      animal TEXT,
      status TEXT DEFAULT 'pending',
      printify_product_id TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await pool.query(`
    ALTER TABLE designs ADD COLUMN IF NOT EXISTS public_id TEXT;
  `);
  console.log('Tabelat partners, products dhe designs jane gati.');
}
module.exports = { pool, initDb };
