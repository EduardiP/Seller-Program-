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

app.get('/me', (req, res) => {
  if (!SHOPIFY_API_SECRET) {
    return res.status(500).json({ error: 'Mungon SHOPIFY_API_SECRET.' });
  }

  if (!verifyAppProxySignature(req.query, SHOPIFY_API_SECRET)) {
    return res.status(401).json({ error: 'Kerkese e pavlefshme.' });
  }

  const customerId = req.query.logged_in_customer_id;

  if (!customerId) {
    return res.json({ loggedIn: false });
  }

  return res.json({
    loggedIn: true,
    customerId: customerId,
    shop: req.query.shop || null,
  });
});

app.get('/health', (req, res) => res.send('OK'));
app.get('/', (req, res) => res.send('Seller program backend eshte gjalle.'));

app.listen(PORT, () => {
  console.log(`Serveri po degjon ne portin ${PORT}`);
});
