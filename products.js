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

  // Nese e ke caktuar PRINTIFY_SHOP_ID te Railway, perdoret ai.
  if (process.env.PRINTIFY_SHOP_ID) {
    cachedShopId = process.env.PRINTIFY_SHOP_ID;
    return cachedShopId;
  }

  const shops = await printifyFetch('/shops.json');
  if (Array.isArray(shops) && shops.length > 0) {
    // Zgjedh dyqanin Shopify; nese s'ka, merr te parin.
    const shopify = shops.find(function (s) { return s.sales_channel === 'shopify'; });
    cachedShopId = (shopify || shops[0]).id;
    return cachedShopId;
  }
  throw new Error('Nuk u gjet asnje dyqan ne llogarine Printify.');
}

// TEST: kthen listen e dyqaneve — per te konfirmuar qe token-i punon.
router.get('/printify/shops', requireShopifyProxy, async function (req, res) {
  try {
    const shops = await printifyFetch('/shops.json');
    res.json({ ok: true, shops: shops });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, detail: e.body || null });
  }
});

// Fjale kyce: vetem t-shirt dhe tank top.
const TOPWEAR_KEYWORDS = [
  'tee', 't-shirt', 'tshirt',
  'tank'
];

const TOPWEAR_EXCLUDE = [
  'baby', 'infant', 'toddler', 'onesie', 'bib', 'kids', 'youth',
  'dog', 'pet', 'mug', 'bag', 'case', 'sock', 'hat', 'cap', 'beanie',
  'blanket', 'pillow', 'towel', 'apron', 'sticker', 'poster', 'canvas',
  'long sleeve', 'longsleeve', 'sweatshirt', 'hoodie', 'hooded',
  'polo', 'pullover', 'crewneck', 'crew neck', 'jacket', 'dress'
];

function isTopwear(title) {
  const t = (title || '').toLowerCase();
  const excluded = TOPWEAR_EXCLUDE.some(function (w) { return t.indexOf(w) !== -1; });
  if (excluded) return false;
  return TOPWEAR_KEYWORDS.some(function (w) { return t.indexOf(w) !== -1; });
}

// KATALOGU: kthen listen e produkteve baze (blueprints) nga Printify.
// ?all=1 kthen te gjitha; pa te, kthen vetem veshjet e siperme.
router.get('/printify/catalog', requireShopifyProxy, async function (req, res) {
  try {
    const blueprints = await printifyFetch('/catalog/blueprints.json');
    let list = (blueprints || []).map(function (b) {
      return {
        id: b.id,
        title: b.title,
        brand: b.brand,
        model: b.model,
        image: (b.images && b.images[0]) || null
      };
    });
    if (req.query.all !== '1') {
      list = list.filter(function (b) { return isTopwear(b.title); });
    }
    res.json({ ok: true, count: list.length, blueprints: list });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, detail: e.body || null });
  }
});

module.exports = { router, printifyFetch, getShopId };
