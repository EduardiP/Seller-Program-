const express = require('express');
const crypto = require('crypto');
const { pool } = require('./db');

const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;

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

function requireShopifyProxy(req, res, next) {
  if (!SHOPIFY_API_SECRET) {
    return res.status(500).json({ error: 'Mungon SHOPIFY_API_SECRET.' });
  }
  if (!verifyAppProxySignature(req.query, SHOPIFY_API_SECRET)) {
    return res.status(401).json({ error: 'Kerkese e pavlefshme.' });
  }
  req.customerId = req.query.logged_in_customer_id
    ? String(req.query.logged_in_customer_id)
    : null;
  next();
}

const router = express.Router();

router.get('/me', requireShopifyProxy, async (req, res) => {
  const customerId = req.customerId;
  if (!customerId) {
    return res.json({ loggedIn: false });
  }
  try {
    const result = await pool.query(
      'SELECT customer_id, email, creator_name, terms_accepted FROM partners WHERE customer_id = $1',
      [customerId]
    );
    if (result.rows.length === 0) {
      return res.json({ loggedIn: true, registered: false, customerId });
    }
    const p = result.rows[0];
    return res.json({
      loggedIn: true,
      registered: true,
      customerId: p.customer_id,
      email: p.email,
      creatorName: p.creator_name,
      termsAccepted: p.terms_accepted,
    });
  } catch (err) {
    console.error('Gabim DB /me:', err);
    return res.status(500).json({ error: 'Gabim i brendshem.' });
  }
});

router.post('/register', requireShopifyProxy, async (req, res) => {
  const customerId = req.customerId;
  if (!customerId) {
    return res.status(401).json({ error: 'Duhet te jesh i kycur.' });
  }

  const email = (req.body && req.body.email) ? String(req.body.email).trim() : null;
  const creatorName = (req.body && req.body.name) ? String(req.body.name).trim() : null;
  const termsAccepted = !!(req.body && req.body.termsAccepted);

  if (!creatorName) {
    return res.status(400).json({ error: 'Emri eshte i detyrueshem.' });
  }
  if (!termsAccepted) {
    return res.status(400).json({ error: 'Duhet te pranosh kushtet.' });
  }

  try {
    const existing = await pool.query(
      'SELECT customer_id FROM partners WHERE customer_id = $1',
      [customerId]
    );
    if (existing.rows.length > 0) {
      return res.json({ registered: true, alreadyExisted: true, customerId });
    }

    await pool.query(
      `INSERT INTO partners
         (customer_id, email, creator_name, terms_accepted, terms_accepted_at)
       VALUES ($1, $2, $3, $4, now())`,
      [customerId, email, creatorName, termsAccepted]
    );

    return res.json({ registered: true, alreadyExisted: false, customerId });
  } catch (err) {
    console.error('Gabim DB /register:', err);
    return res.status(500).json({ error: 'Gabim i brendshem.' });
  }
});

module.exports = { router, verifyAppProxySignature, requireShopifyProxy };
