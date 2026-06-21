// products.js — lidhja me Printify API
// Token-i i Printify rri vetem ketu (server-side), kurre te frontend-i.

const express = require('express');
const { requireShopifyProxy } = require('./auth');
const { pool } = require('./db');

const router = express.Router();

const PRINTIFY_BASE = 'https://api.printify.com/v1';
const PRINTIFY_TOKEN = process.env.PRINTIFY_API_TOKEN;

// Ndihmes: ben nje kerkese te Printify me header-at e duhur.
async function printifyFetch(path, options) {
  options = options || {};
  const res = await fetch(PRINTIFY_BASE + path, {
    method: options.method || 'GET',
    headers: {
      'Authorization': 'Bearer ' + PRINTIFY_TOKEN,
      'Content-Type': 'application/json;charset=utf-8',
      'User-Agent': 'SellerProgram'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }

  if (!res.ok) {
    const err = new Error('Printify error ' + res.status);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

// Cache i thjeshte per Shop ID.
let cachedShopId = null;

async function getShopId() {
  if (cachedShopId) return cachedShopId;
  if (process.env.PRINTIFY_SHOP_ID) {
    cachedShopId = process.env.PRINTIFY_SHOP_ID;
    return cachedShopId;
  }
  const shops = await printifyFetch('/shops.json');
  if (Array.isArray(shops) && shops.length > 0) {
    const shopify = shops.find(function (s) { return s.sales_channel === 'shopify'; });
    cachedShopId = (shopify || shops[0]).id;
    return cachedShopId;
  }
  throw new Error('Nuk u gjet asnje dyqan ne llogarine Printify.');
}

// TEST: kthen listen e dyqaneve.
router.get('/printify/shops', requireShopifyProxy, async function (req, res) {
  try {
    const shops = await printifyFetch('/shops.json');
    res.json({ ok: true, shops: shops });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, detail: e.body || null });
  }
});

// ID-te e produkteve te zgjedhura nga ti (vetem keto i shohin partneret).
const SELECTED_BLUEPRINT_IDS = [
  5, 6, 9, 10, 12, 14, 15, 26, 88, 100, 139, 142, 145, 184, 279, 281,
  454, 460, 466, 518, 526, 565, 577, 605, 606, 607, 664, 706, 725, 751,
  1032, 1089, 1121, 1184, 1269, 1318, 1321, 1326, 1336, 1349, 1350, 1358,
  1382, 1459, 1484, 1575, 1585, 1669, 1942, 2039, 2835, 2840, 2842, 2856,
  2910, 2925, 2927, 2964, 3035, 3042, 3104, 3113, 3117, 4131, 4745, 5345
];

function isSelected(id) {
  return SELECTED_BLUEPRINT_IDS.indexOf(id) !== -1;
}

// KATALOGU: kthen vetem produktet e zgjedhura.
router.get('/printify/catalog', requireShopifyProxy, async function (req, res) {
  try {
    const blueprints = await printifyFetch('/catalog/blueprints.json');
    const list = (blueprints || [])
      .filter(function (b) { return isSelected(b.id); })
      .map(function (b) {
        return {
          id: b.id,
          title: b.title,
          brand: b.brand,
          model: b.model,
          image: (b.images && b.images[0]) || null
        };
      });
    res.json({ ok: true, count: list.length, blueprints: list });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, detail: e.body || null });
  }
});

// FAQE PROVIZORE: tregon produktet me foto, titull dhe id.
router.get('/printify/catalog-view', requireShopifyProxy, async function (req, res) {
  try {
    const blueprints = await printifyFetch('/catalog/blueprints.json');
    let list;
    if (req.query.all === '1') {
      list = (blueprints || []).filter(function (b) {
        const t = (b.title || '').toLowerCase();
        return t.indexOf('tee') !== -1 || t.indexOf('shirt') !== -1 || t.indexOf('tank') !== -1;
      });
    } else {
      list = (blueprints || []).filter(function (b) { return isSelected(b.id); });
    }

    let cards = '';
    list.forEach(function (b) {
      const img = (b.images && b.images[0]) || '';
      cards +=
        '<div style="border:1px solid #ddd;border-radius:8px;padding:8px;width:180px;font-family:sans-serif;">' +
          '<img src="' + img + '" style="width:100%;height:160px;object-fit:cover;border-radius:6px;" loading="lazy">' +
          '<div style="font-size:13px;margin-top:6px;font-weight:600;">' + b.title + '</div>' +
          '<div style="font-size:12px;color:#666;">' + (b.brand || '') + '</div>' +
          '<div style="font-size:14px;color:#111;margin-top:4px;">ID: <b>' + b.id + '</b></div>' +
        '</div>';
    });

    const html =
      '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Catalog</title></head><body style="margin:0;padding:16px;background:#fafafa;">' +
      '<h2 style="font-family:sans-serif;">Produktet (' + list.length + ')</h2>' +
      '<div style="display:flex;flex-wrap:wrap;gap:12px;">' + cards + '</div>' +
      '</body></html>';

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) {
    res.status(500).send('Error: ' + e.message);
  }
});

// VARIANTET: per nje produkt, kthen print provider-in e pare dhe variantet.
router.get('/printify/blueprint/:id/variants', requireShopifyProxy, async function (req, res) {
  try {
    const blueprintId = req.params.id;
    if (!isSelected(parseInt(blueprintId, 10))) {
      return res.status(400).json({ ok: false, error: 'Produkt i palejuar.' });
    }

    const providers = await printifyFetch('/catalog/blueprints/' + blueprintId + '/print_providers.json');
    if (!Array.isArray(providers) || providers.length === 0) {
      return res.status(404).json({ ok: false, error: 'Nuk u gjet print provider.' });
    }
    const provider = providers[0];

    const variantsData = await printifyFetch(
      '/catalog/blueprints/' + blueprintId + '/print_providers/' + provider.id + '/variants.json'
    );
    const variants = (variantsData && variantsData.variants) || [];

    const colors = [];
    const sizes = [];
    variants.forEach(function (v) {
      const c = v.options && v.options.color;
      const s = v.options && v.options.size;
      if (c && colors.indexOf(c) === -1) colors.push(c);
      if (s && sizes.indexOf(s) === -1) sizes.push(s);
    });

    res.json({
      ok: true,
      blueprintId: parseInt(blueprintId, 10),
      printProviderId: provider.id,
      printProviderTitle: provider.title,
      colors: colors,
      sizes: sizes,
      variantCount: variants.length,
      variants: variants.map(function (v) {
        return { id: v.id, color: v.options && v.options.color, size: v.options && v.options.size };
      })
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, detail: e.body || null });
  }
});

// NGARKIM IMAZHI: merr nje imazh (base64 ose URL) dhe e ngarkon te Printify.
router.post('/printify/upload-image', requireShopifyProxy, express.json({ limit: '15mb' }), async function (req, res) {
  try {
    const body = req.body || {};
    const fileName = body.fileName || 'design.png';
    let payload;

    if (body.imageBase64) {
      payload = { file_name: fileName, contents: body.imageBase64 };
    } else if (body.imageUrl) {
      payload = { file_name: fileName, url: body.imageUrl };
    } else {
      return res.status(400).json({ ok: false, error: 'Mungon imazhi (imageBase64 ose imageUrl).' });
    }

    const uploaded = await printifyFetch('/uploads/images.json', { method: 'POST', body: payload });
    res.json({ ok: true, imageId: uploaded.id, preview: uploaded.preview_url || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, detail: e.body || null });
  }
});

// KRIJIM PRODUKTI (DRAFT): krijon nje produkt te Printify pa e publikuar.
router.post('/printify/create-product', requireShopifyProxy, express.json({ limit: '2mb' }), async function (req, res) {
  try {
    const b = req.body || {};
    const blueprintId = parseInt(b.blueprintId, 10);
    const printProviderId = parseInt(b.printProviderId, 10);
    const imageId = b.imageId;
    const title = (b.title || '').trim();
    const variantIds = Array.isArray(b.variantIds) ? b.variantIds : [];
    const price = parseInt(b.price, 10) || 2499; // ne cent (2499 = 24.99)

    if (!isSelected(blueprintId)) {
      return res.status(400).json({ ok: false, error: 'Produkt i palejuar.' });
    }
    if (!printProviderId || !imageId || !title || variantIds.length === 0) {
      return res.status(400).json({ ok: false, error: 'Te dhena te paplota (provider, imazh, titull, variante).' });
    }

    const shopId = await getShopId();

    const variants = variantIds.map(function (vid) {
      return { id: parseInt(vid, 10), price: price, is_enabled: true };
    });

    const printAreas = [{
      variant_ids: variantIds.map(function (vid) { return parseInt(vid, 10); }),
      placeholders: [{
        position: 'front',
        images: [{ id: imageId, x: 0.5, y: 0.5, scale: 1, angle: 0 }]
      }]
    }];

    const payload = {
      title: title,
      description: 'Created via Seller Program.',
      blueprint_id: blueprintId,
      print_provider_id: printProviderId,
      variants: variants,
      print_areas: printAreas
    };

    const created = await printifyFetch('/shops/' + shopId + '/products.json', { method: 'POST', body: payload });

    // Ruaj produktin te baza, te lidhur me partnerin (per komision dhe listim).
    var previewUrl = null;
    if (created.images && created.images.length > 0) {
      previewUrl = created.images[0].src || null;
    }
    try {
      await pool.query(
        `INSERT INTO products (customer_id, printify_product_id, title, blueprint_id, preview_url, published)
         VALUES ($1, $2, $3, $4, $5, false)`,
        [req.customerId, String(created.id), created.title, blueprintId, previewUrl]
      );
    } catch (dbErr) {
      console.error('Gabim ruajtje produkti te DB:', dbErr);
    }

    res.json({ ok: true, productId: created.id, title: created.title, published: false });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, detail: e.body || null });
  }
});

// PRODUKTET E MIA: kthen vetem produktet e ketij partneri (nga baza jone).
router.get('/printify/my-products', requireShopifyProxy, async function (req, res) {
  try {
    if (!req.customerId) {
      return res.status(401).json({ ok: false, error: 'Duhet te jesh i kycur.' });
    }
    const result = await pool.query(
      `SELECT printify_product_id, title, blueprint_id, preview_url, published, created_at
         FROM products
        WHERE customer_id = $1
        ORDER BY created_at DESC`,
      [req.customerId]
    );
    res.json({ ok: true, count: result.rows.length, products: result.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = { router, printifyFetch, getShopId };
