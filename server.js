const express = require('express');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;

// Lidhja me PostgreSQL (Railway jep DATABASE_URL vete).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Krijon tabelen e partnereve nese s'ekziston (vetem heren e pare).
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

// Verifikimi i firmes se App Proxy.
function verifyAppProxySignature(query, secret) {
  const { signature, ...rest } = query;
  if (!signature) return false;

  const message = Object.keys(rest)
    .sort()
    .map((key) => {
      const value = Array.isArray(rest[key]) ? rest[key].join(',') : rest[key];
      return `${key}=${value}`;
    })
    .join('');

  const computed = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'utf-8'),
      Buffer.from(signature, 'utf-8')
    );
  } catch {
    return false;
  }
}

// Helper: kontrollon firmen dhe kthen customerId, ose null.
function getVerifiedCustomerId(query) {
  if (!verifyAppProxySignature(query, SHOPIFY_API_SECRET)) return null;
  const id = query.logged_in_customer_id;
  return id ? String(id) : null;
}

// ------------------------------------------------------------
// /me  -> gjendja e partnerit
// Kthen: nese eshte i kycur, dhe nese eshte regjistruar si seller.
// ------------------------------------------------------------
app.get('/me', async (req, res) => {
  if (!SHOPIFY_API_SECRET) {
    return res.status(500).json({ error: 'Mungon SHOPIFY_API_SECRET.' });
  }
  if (!verifyAppProxySignature(req.query, SHOPIFY_API_SECRET)) {
    return res.status(401).json({ error: 'Kerkese e pavlefshme.' });
  }

  const customerId = req.query.logged_in_customer_id
    ? String(req.query.logged_in_customer_id)
    : null;

  if (!customerId) {
    return res.json({ loggedIn: false });
  }

  try {
    const result = await pool.query(
      'SELECT customer_id, email, creator_name FROM partners WHERE customer_id = $1',
      [customerId]
    );

    if (result.rows.length === 0) {
      // I kycur, por jo i regjistruar si seller.
      return res.json({ loggedIn: true, registered: false, customerId });
    }

    // I regjistruar -> kthejme profilin.
    const p = result.rows[0];
    return res.json({
      loggedIn: true,
      registered: true,
      customerId: p.customer_id,
      email: p.email,
      creatorName: p.creator_name,
    });
  } catch (err) {
    console.error('Gabim DB /me:', err);
    return res.status(500).json({ error: 'Gabim i brendshem.' });
  }
});

// ------------------------------------------------------------
// /register  -> regjistron partnerin (vetem heren e pare)
// Pranon: email (nga forma). customerId vjen nga firma e Shopify.
// ------------------------------------------------------------
app.post('/register', async (req, res) => {
  if (!SHOPIFY_API_SECRET) {
    return res.status(500).json({ error: 'Mungon SHOPIFY_API_SECRET.' });
  }
  if (!verifyAppProxySignature(req.query, SHOPIFY_API_SECRET)) {
    return res.status(401).json({ error: 'Kerkese e pavlefshme.' });
  }

  const customerId = req.query.logged_in_customer_id
    ? String(req.query.logged_in_customer_id)
    : null;

  if (!customerId) {
    return res.status(401).json({ error: 'Duhet te jesh i kycur.' });
  }

  const email = (req.body && req.body.email) ? String(req.body.email).trim() : null;

  try {
    // Nese ekziston tashme, s'e regjistrojme perseri.
    const existing = await pool.query(
      'SELECT customer_id FROM partners WHERE customer_id = $1',
      [customerId]
    );
    if (existing.rows.length > 0) {
      return res.json({ registered: true, alreadyExisted: true, customerId });
    }

    await pool.query(
      'INSERT INTO partners (customer_id, email) VALUES ($1, $2)',
      [customerId, email]
    );

    return res.json({ registered: true, alreadyExisted: false, customerId });
  } catch (err) {
    console.error('Gabim DB /register:', err);
    return res.status(500).json({ error: 'Gabim i brendshem.' });
  }
});

app.get('/health', (req, res) => res.send('OK'));
app.get('/', (req, res) => res.send('Seller program backend eshte gjalle.'));

// Nis serverin pas pergatitjes se database-s.
initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Serveri po degjon ne portin ${PORT}`));
  })
  .catch((err) => {
    console.error('Deshtoi init i DB:', err);
    process.exit(1);
  });
