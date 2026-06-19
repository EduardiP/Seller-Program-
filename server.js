const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
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

app.get('/', (req, res) => {
  if (!SHOPIFY_API_SECRET) {
    return res.status(500).send('Konfigurim i paplotesuar: mungon SHOPIFY_API_SECRET.');
  }

  if (!verifyAppProxySignature(req.query, SHOPIFY_API_SECRET)) {
    return res.status(401).send('Kerkese e pavlefshme.');
  }

  const customerId = req.query.logged_in_customer_id;
  res.set('Content-Type', 'application/liquid');

  if (!customerId) {
    return res.send(`
      <div style="max-width:420px;margin:3rem auto;text-align:center;font-family:sans-serif;">
        <h2>Programi i krijuesve</h2>
        <p>Per te vazhduar, fillimisht hyr ne llogarine tende.</p>
        <a href="/account/login" style="display:inline-block;margin-top:1rem;padding:.75rem 1.5rem;background:#111;color:#fff;text-decoration:none;border-radius:6px;">Hyr</a>
      </div>
    `);
  }

  return res.send(`
    <div style="max-width:420px;margin:3rem auto;text-align:center;font-family:sans-serif;">
      <h2>Mire se erdhe!</h2>
      <p>Je i kycur. ID jote te Shopify: <strong>${customerId}</strong></p>
      <p style="opacity:.7;font-size:.9rem;">Ura mes Shopify dhe Railway funksionon.</p>
    </div>
  `);
});

app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Serveri po degjon ne portin ${PORT}`);
});
