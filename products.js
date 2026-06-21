// products.js — lidhja me Printify API
const express = require('express');
const { requireShopifyProxy } = require('./auth');

const router = express.Router();

const PRINTIFY_BASE = 'https://api.printify.com/v1';
const PRINTIFY_TOKEN = process.env.PRINTIFY_API_TOKEN;

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
// Pa parametra: vetem te zgjedhurat. Me ?all=1: te gjitha t-shirt/tank.
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

// VARIANTET: per nje produkt te zgjedhur, kthen print provider-in e pare
// dhe variantet (ngjyra + madhesi). Frontend-i e perdor per te ndertuar formen.
router.get('/printify/blueprint/:id/variants', requireShopifyProxy, async function (req, res) {
  try {
    const blueprintId = req.params.id;
    if (!isSelected(parseInt(blueprintId, 10))) {
      return res.status(400).json({ ok: false, error: 'Produkt i palejuar.' });
    }

    // 1) Print providers per kete produkt.
    const providers = await printifyFetch('/catalog/blueprints/' + blueprintId + '/print_providers.json');
    if (!Array.isArray(providers) || providers.length === 0) {
      return res.status(404).json({ ok: false, error: 'Nuk u gjet print provider.' });
    }
    const provider = providers[0]; // marrim te parin per thjeshtesi

    // 2) Variantet per kete produkt + provider.
    const variantsData = await printifyFetch(
      '/catalog/blueprints/' + blueprintId + '/print_providers/' + provider.id + '/variants.json'
    );
    const variants = (variantsData && variantsData.variants) || [];

    // Nxjerrim ngjyrat dhe madhesite unike (per menu).
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

module.exports = { router, printifyFetch, getShopId };
