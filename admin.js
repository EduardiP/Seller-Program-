// admin.js — paneli i adminimit (brenda Shopify admin te app-i).
// Gjeneron imazhe me AI, i shfaq per miratim, dhe i pranuarit i ben produkte.
// Strukture me tabe: Dizajnet / Mockupet / Videot / Postimet.
 
const express = require('express');
const { generateConcept, generateImage, generateTextConcept } = require('./ai');
const { pool } = require('./db');
 
// Tabela e publikimeve (dizajni, orari, kolona, statusi) — krijohet nje here.
async function initPublications() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS publications (
      id SERIAL PRIMARY KEY,
      design_id INTEGER,
      image_url TEXT,
      pinterest_when TIMESTAMP,
      buffer_when TIMESTAMP,
      channels TEXT,
      status TEXT DEFAULT 'scheduled',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}
initPublications().catch(function (e) { console.error('initPublications:', e.message); });
const { printifyFetch, getShopId } = require('./products');
const cloudinary = require('cloudinary').v2;
 
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
 
// Ngarkon nje imazh base64 te Cloudinary dhe kthen URL-n.
async function uploadToCloudinary(b64) {
  const dataUri = 'data:image/png;base64,' + b64;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'seller-designs',
    resource_type: 'image'
  });
  return { url: result.secure_url, publicId: result.public_id };
}
 
const router = express.Router();
 
function requireAdmin(req, res, next) {
  next();
}
 
function buildTypographyPrompt(concept) {
  var styles = [
    'a painted brush-script style (explore freely within hand-painted lettering)',
    'a collegiate / varsity style (explore freely within athletic arched lettering, with or without outline)',
    'a textured-fill style where letters are filled with subtle patterns or texture (explore freely)',
    'an outlined / bordered lettering style (explore freely with letter outlines and borders)',
    'a clean modern minimalist style (explore freely within simple elegant typography)',
    'a bold statement style (explore freely with one dominant oversized word)',
    'a vintage retro distressed style (explore freely within worn retro typography)',
    'an elegant serif fashion style (explore freely within refined high-end serif lettering)',
    'a chunky rounded bubble-letter style (explore freely within playful bold rounded type)',
    'a hand-drawn doodle style (explore freely within casual sketchy hand lettering)'
  ];
  var style = styles[Math.floor(Math.random() * styles.length)];
 
  return 'A professional TEXT-ONLY t-shirt graphic design on a fully transparent background. ' +
    'There is NO image, NO illustration, NO character — only beautifully arranged typography. ' +
    'The design shows exactly this funny slogan as the entire artwork: "' + concept.text + '". ' +
    'Use ' + style + '. Feel free to interpret this style creatively and explore variations, ' +
    'while keeping it clean and suitable for t-shirt printing. ' +
    'Use color tastefully; a border or outline on the text is optional depending on what fits the style. ' +
    'The lettering is large, well-composed, balanced, and centered, ' +
    'arranged across multiple lines for visual rhythm, fully inside the frame with margin, nothing cut off. ' +
    'High-quality print-ready t-shirt typography, crisp clean edges, ' +
    'transparent background, no background shapes, sticker-ready, high resolution.';
}
 
function buildDesignPrompt(concept) {
  return 'A high-quality vintage retro t-shirt graphic design on a fully transparent background. ' +
    'The main subject is ' + concept.animal + ' with a strongly exaggerated, comedic ' + concept.expression + ' expression ' +
    'that clearly and humorously matches the mood of the caption — the facial expression should be the funniest part, very expressive and over-the-top. ' +
    'Drawn in a distressed vintage screen-print / halftone illustration style. ' +
    'You may vary the composition freely while staying vintage: ' +
    'sometimes a retro sunburst or circle, sometimes a simple distressed badge, sometimes just textured background shapes, ' +
    'sometimes minimal — explore different vintage layouts, do not always use the same sunset-mountains-trees scene. ' +
    'Use a warm retro color palette (black, burnt-orange, cream, muted tones), but vary accent colors between designs. ' +
    'The funny caption text reads exactly: "' + concept.text + '". ' +
    'The text is large, bold, hand-lettered, in a mix of grunge brush and condensed vintage fonts, ' +
    'arranged artistically so text and animal share the space without overlapping, ' +
    'all text fully inside the frame with margin, nothing cut off. ' +
    'Polished professional t-shirt print, distressed vintage texture, ' +
    'transparent background, no photo background, sticker-ready, high quality.';
}
 
router.get('/admin/generate-one', requireAdmin, async function (req, res) {
  try {
    const concept = await generateConcept();
    const prompt = buildDesignPrompt(concept);
    const b64 = await generateImage(prompt);
    const uploaded = await uploadToCloudinary(b64);
    const saved = await pool.query(
      `INSERT INTO designs (image_url, public_id, caption, caption_sq, animal, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id`,
      [uploaded.url, uploaded.publicId, concept.text || '', concept.albanian || '', concept.animal || '']
    );
    res.json({ ok: true, id: saved.rows[0].id, concept: concept, imageUrl: uploaded.url });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, detail: e.body || null });
  }
});
 
router.get('/admin/generate-text-one', requireAdmin, async function (req, res) {
  try {
    const concept = await generateTextConcept();
    const prompt = buildTypographyPrompt(concept);
    const b64 = await generateImage(prompt);
    const uploaded = await uploadToCloudinary(b64);
    const saved = await pool.query(
      `INSERT INTO designs (image_url, public_id, caption, caption_sq, animal, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id`,
      [uploaded.url, uploaded.publicId, concept.text || '', concept.albanian || '', 'text-only']
    );
    res.json({ ok: true, id: saved.rows[0].id, concept: concept, imageUrl: uploaded.url });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, detail: e.body || null });
  }
});
 
const APPROVE_BLUEPRINT_IDS = [
  5, 6, 9, 10, 12, 14, 15, 26, 88, 100, 139, 142, 145, 184, 279, 281,
  454, 460, 466, 518, 526, 565, 577, 605, 606, 607, 664, 706, 725, 751,
  1032, 1089, 1121, 1184, 1269, 1318, 1321, 1326, 1336, 1349, 1350, 1358,
  1382, 1459, 1484, 1575, 1585, 1669, 1942, 2039, 2835, 2840, 2842, 2856,
  2910, 2925, 2927, 2964, 3035, 3042, 3104, 3113, 3117, 4131, 4745, 5345
];
 
router.get('/admin/approve', requireAdmin, async function (req, res) {
  try {
    const id = parseInt(req.query.id, 10);
    const position = (req.query.position === 'back') ? 'back' : 'front';
    if (!id) return res.status(400).json({ ok: false, error: 'Mungon id.' });
    const d = await pool.query('SELECT * FROM designs WHERE id = $1', [id]);
    if (d.rows.length === 0) return res.status(404).json({ ok: false, error: 'Dizajni s\'u gjet.' });
    const design = d.rows[0];
    const blueprintId = APPROVE_BLUEPRINT_IDS[Math.floor(Math.random() * APPROVE_BLUEPRINT_IDS.length)];
    const providers = await printifyFetch('/catalog/blueprints/' + blueprintId + '/print_providers.json');
    if (!providers || providers.length === 0) throw new Error('S\'ka print provider per kete veshje.');
    const printProviderId = providers[0].id;
    const variantsData = await printifyFetch(
      '/catalog/blueprints/' + blueprintId + '/print_providers/' + printProviderId + '/variants.json'
    );
    const allVariants = (variantsData && variantsData.variants) || [];
    if (allVariants.length === 0) throw new Error('S\'ka variante per kete veshje.');
    const variantIds = allVariants.map(function (v) { return v.id; });
    const uploaded = await printifyFetch('/uploads/images.json', {
      method: 'POST',
      body: { file_name: 'design-' + id + '.png', url: design.image_url }
    });
    const imageId = uploaded.id;
    const shopId = await getShopId();
    const variants = variantIds.map(function (vid) {
      return { id: vid, price: 2499, is_enabled: true };
    });
    const printAreas = [{
      variant_ids: variantIds,
      placeholders: [{
        position: position,
        images: [{ id: imageId, x: 0.5, y: 0.5, scale: 1, angle: 0 }]
      }]
    }];
    const payload = {
      title: design.caption || 'Funny design',
      description: 'Created via Seller Program (AI).',
      blueprint_id: blueprintId,
      print_provider_id: printProviderId,
      variants: variants,
      print_areas: printAreas
    };
    const created = await printifyFetch('/shops/' + shopId + '/products.json', { method: 'POST', body: payload });
    await pool.query(
      `UPDATE designs SET status = 'approved', printify_product_id = $1 WHERE id = $2`,
      [String(created.id), id]
    );
    res.json({ ok: true, productId: created.id, blueprintId: blueprintId });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, detail: e.body || null });
  }
});
 
router.get('/admin/approved', requireAdmin, async function (req, res) {
  try {
    const result = await pool.query(
      `SELECT id, image_url, caption, caption_sq, animal, printify_product_id, created_at
         FROM designs WHERE status = 'approved' ORDER BY created_at DESC`
    );
    res.json({ ok: true, designs: result.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
 
router.get('/admin/pending', requireAdmin, async function (req, res) {
  try {
    const result = await pool.query(
      `SELECT id, image_url, caption, caption_sq, animal, created_at
         FROM designs WHERE status = 'pending' ORDER BY created_at DESC`
    );
    res.json({ ok: true, designs: result.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
 
router.get('/admin/all', requireAdmin, async function (req, res) {
  try {
    const result = await pool.query(
      `SELECT id, image_url, caption, caption_sq, animal, status, printify_product_id, created_at
         FROM designs WHERE image_url IS NOT NULL ORDER BY created_at DESC`
    );
    res.json({ ok: true, designs: result.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
 
router.get('/admin/reject', requireAdmin, async function (req, res) {
  try {
    const id = parseInt(req.query.id, 10);
    if (!id) return res.status(400).json({ ok: false, error: 'Mungon id.' });
    const r = await pool.query('SELECT public_id FROM designs WHERE id = $1', [id]);
    if (r.rows.length > 0 && r.rows[0].public_id) {
      try { await cloudinary.uploader.destroy(r.rows[0].public_id); } catch (ce) { console.error('Cloudinary destroy:', ce.message); }
    }
    await pool.query('DELETE FROM designs WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
 
// RUAN nje publikim (dizajni, oraret, kanalet e zgjedhura).
router.get('/admin/publish-save', requireAdmin, async function (req, res) {
  try {
    const designId = parseInt(req.query.designId, 10) || null;
    const imageUrl = req.query.image || null;
    const pinterestWhen = req.query.pinterestWhen || null;
    const bufferWhen = req.query.bufferWhen || null;
    const channels = req.query.channels || '';
    const saved = await pool.query(
      `INSERT INTO publications (design_id, image_url, pinterest_when, buffer_when, channels, status)
       VALUES ($1,$2,$3,$4,$5,'scheduled') RETURNING id`,
      [designId, imageUrl, pinterestWhen, bufferWhen, channels]
    );
    res.json({ ok: true, id: saved.rows[0].id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
 
// KTHEN publikimet (per seksionin te home i Urdherat).
router.get('/admin/publications', requireAdmin, async function (req, res) {
  try {
    const r = await pool.query(
      `SELECT id, design_id, image_url, pinterest_when, buffer_when, channels, status, created_at
         FROM publications ORDER BY created_at DESC LIMIT 50`
    );
    res.json({ ok: true, publications: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
 
router.get('/', function (req, res) {
  const token = req.query.token || '';
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(buildAdminHtml(token));
});
 
function buildAdminHtml(token) {
  var RAILWAY = 'https://seller-program-production.up.railway.app';
  return '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Seller Program — Admin</title>' +
    '<style>' +
    'body{font-family:system-ui,sans-serif;margin:0;padding:0;background:#f7f7f8;color:#111;}' +
    '.wrap{max-width:1000px;margin:0 auto;padding:20px;}' +
    '.tabs{display:flex;gap:6px;border-bottom:2px solid #e3e3e3;margin-bottom:20px;flex-wrap:wrap;}' +
    '.tab{padding:12px 20px;background:none;border:none;border-bottom:3px solid transparent;cursor:pointer;font-size:15px;font-weight:600;color:#888;margin-bottom:-2px;}' +
    '.tab.active{color:#111;border-bottom-color:#111;}' +
    '.panel{display:none;}' +
    '.panel.active{display:block;}' +
    '.card{background:#fff;border:1px solid #e3e3e3;border-radius:10px;padding:12px;}' +
    '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;}' +
    '.btn{padding:10px 20px;background:#111;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:15px;}' +
    '.btn-green{background:#1a7f37;}' +
    '.btn-light{background:#fff;border:1px solid #ccc;color:#333;}' +
    '</style></head>' +
    '<body><div class="wrap">' +
    '<h1 style="margin:0 0 16px;">Seller Program — Admin</h1>' +
 
    '<div class="tabs">' +
      '<button class="tab active" data-tab="dizajnet">Dizajnet</button>' +
      '<button class="tab" data-tab="urdherat">Urdherat</button>' +
      '<button class="tab" data-tab="mockupet">Pinterest</button>' +
      '<button class="tab" data-tab="videot">Buffer</button>' +
    '</div>' +
 
    // ---- TAB: DIZAJNET ----
    '<div class="panel active" id="tab-dizajnet">' +
      '<div class="card" style="margin-bottom:20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">' +
        '<label style="font-weight:600;">Sa imazhe:</label>' +
        '<input id="count" type="number" min="1" max="20" value="3" style="width:80px;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:16px;">' +
        '<button id="gen-btn" class="btn">Gjenero (me imazh)</button>' +
        '<span style="width:1px;height:30px;background:#ddd;"></span>' +
        '<label style="font-weight:600;">Sa tekste:</label>' +
        '<input id="count-text" type="number" min="1" max="20" value="3" style="width:80px;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:16px;">' +
        '<button id="gen-text-btn" class="btn" style="background:#3a3a8a;">Gjenero (vetem tekst)</button>' +
        '<span id="status" style="color:#666;"></span>' +
      '</div>' +
      '<div id="main-view">' +
        '<button id="show-approved" class="btn-light" style="margin-bottom:16px;padding:8px 16px;border-radius:8px;font-size:14px;">📁 Te pranuarat</button>' +
        '<div id="grid" class="grid"></div>' +
      '</div>' +
      '<div id="approved-view" style="display:none;">' +
        '<button id="back-btn" class="btn-light" style="margin-bottom:16px;padding:8px 14px;border-radius:8px;font-size:16px;">↰ Kthehu</button>' +
        '<h2 style="margin:0 0 16px;font-size:18px;">Dizajnet e pranuara</h2>' +
        '<div id="approved-grid" class="grid"></div>' +
      '</div>' +
    '</div>' +
 
    // ---- TAB: URDHERAT ----
    '<div class="panel" id="tab-urdherat">' +
      '<div id="ord-home">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
          '<h2 style="margin:0;font-size:16px;">Urdherat — dizajnet</h2>' +
          '<button id="ord-all-btn" class="btn-light" style="padding:6px 12px;border-radius:8px;font-size:13px;">Shiko te gjitha</button>' +
        '</div>' +
        '<div id="ord-carousel" style="display:flex;gap:10px;overflow-x:auto;padding-bottom:8px;"></div>' +
        // seksioni i vogel i orareve/publikimeve (do mbushet me vone)
        '<div style="margin-top:18px;">' +
          '<h3 style="margin:0 0 8px;font-size:14px;color:#444;">Publikimet & oraret</h3>' +
          '<div id="ord-schedule" style="background:#fff;border:1px solid #e3e3e3;border-radius:10px;padding:12px;font-size:13px;color:#888;">Ketu do shfaqen produktet e krijuara per publikim dhe oraret e caktuara (se shpejti).</div>' +
        '</div>' +
      '</div>' +
      // dritarja e te gjitha dizajneve (mbi gjithcka)
      '<div id="ord-full" style="display:none;">' +
        '<button id="ord-back" class="btn-light" style="margin-bottom:16px;padding:8px 14px;border-radius:8px;">↰ Kthehu</button>' +
        '<h3 style="margin:0 0 16px;">Te gjitha dizajnet</h3>' +
        '<div id="ord-full-grid" class="grid"></div>' +
      '</div>' +
    '</div>' +
 
    // ---- TAB: MOCKUPET ----
    '<div class="panel" id="tab-mockupet">' +
      '<p style="color:#666;">Krijo nje mockup: nje dizajn i rastesishem mbi nje veshje.</p>' +
      '<button id="mock-btn" class="btn">Krijo mockup</button>' +
      '<div id="mock-out" style="margin-top:16px;"></div>' +
      '<hr style="margin:24px 0;border:none;border-top:1px solid #e3e3e3;">' +
      '<p style="color:#666;">Posto direkt ne Pinterest: krijon mockup + titull SEO nga dizajni i fundit dhe e planifikon.</p>' +
      '<label style="font-size:13px;color:#444;">Orari (kur te postohet): </label>' +
      '<input id="pin-when" type="datetime-local" style="padding:6px;border:1px solid #ccc;border-radius:6px;margin-bottom:10px;"><br>' +
      '<button id="pin-post-btn" class="btn" style="background:#e60023;">Posto ne Pinterest</button>' +
      '<div id="pin-post-msg" style="margin-top:10px;font-size:13px;color:#444;"></div>' +
    '</div>' +
 
    // ---- TAB: VIDEOT ----
    '<div class="panel" id="tab-videot">' +
      '<p style="color:#666;">Krijo nje video funny (kafsha vepron mesazhin e dizajnit). Mund te zgjase 1-3 min.</p>' +
      '<label style="font-size:13px;color:#444;">Orari (kur te postohet ne TikTok+Instagram): </label>' +
      '<input id="vid-when" type="datetime-local" style="padding:6px;border:1px solid #ccc;border-radius:6px;margin-bottom:10px;"><br>' +
      '<button id="vid-btn" class="btn">Krijo video</button>' +
      '<div id="vid-status" style="color:#666;margin-top:10px;min-height:22px;"></div>' +
      '<div id="vid-scene" style="font-size:13px;color:#444;margin-top:6px;"></div>' +
      '<div id="vid-out" style="margin-top:16px;"></div>' +
    '</div>' +
 
    // ---- TAB: POSTIMET ----
    '<div class="panel" id="tab-postimet-removed" style="display:none;"></div>' +
 
    '</div>' +
 
    // ---- MODAL ----
    '<div id="modal-overlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);align-items:center;justify-content:center;z-index:1000;">' +
      '<div style="background:#fff;border-radius:12px;padding:20px;max-width:360px;width:90%;text-align:center;">' +
        '<h3 style="margin:0 0 12px;">Prano dizajnin?</h3>' +
        '<img id="modal-img" src="" style="width:100%;border-radius:8px;background:#eee;margin-bottom:10px;">' +
        '<p id="modal-text" style="font-size:13px;color:#444;margin:0 0 12px;font-weight:600;"></p>' +
        '<p id="modal-msg" style="font-size:12px;color:#a12;margin:0 0 12px;"></p>' +
        '<div style="display:flex;gap:8px;">' +
          '<button id="modal-confirm" class="btn btn-green" style="flex:1;">Konfirmo</button>' +
          '<button id="modal-cancel" class="btn-light" style="flex:1;padding:10px;border-radius:6px;">Anulo</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
 
    // ---- MODAL PUBLIKIMI (brenda urdherat) ----
    '<div id="pub-overlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);align-items:center;justify-content:center;z-index:1000;">' +
      '<div style="background:#fff;border-radius:12px;padding:24px;max-width:700px;width:94%;position:relative;max-height:90vh;overflow-y:auto;">' +
        '<button id="pub-x" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:#888;">✕</button>' +
        '<h3 style="margin:0 0 16px;">Publiko dizajnin</h3>' +
        // oraret sipër me shenjen =
        '<div style="display:flex;align-items:flex-end;gap:10px;margin-bottom:16px;">' +
          '<div style="flex:1;">' +
            '<label style="font-size:12px;color:#444;">Orari Pinterest:</label><br>' +
            '<input id="pub-pin-when" type="datetime-local" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:6px;">' +
          '</div>' +
          '<button id="pub-eq" title="Njesoj" style="height:34px;padding:0 12px;background:#eee;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:16px;">=</button>' +
          '<div style="flex:1;">' +
            '<label style="font-size:12px;color:#444;">Orari Buffer (TikTok+IG):</label><br>' +
            '<input id="pub-buf-when" type="datetime-local" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:6px;">' +
          '</div>' +
        '</div>' +
        // dy kolonat
        '<div style="display:flex;gap:12px;">' +
          '<div style="flex:1;border:1px solid #e3e3e3;border-radius:10px;padding:12px;">' +
            '<h4 style="margin:0 0 10px;font-size:14px;color:#e60023;">Pinterest</h4>' +
            '<button id="pub-mock-btn" class="btn" style="width:100%;background:#e60023;">Krijo mockup</button>' +
            '<div id="pub-mock-out" style="margin-top:10px;"></div>' +
          '</div>' +
          '<div style="flex:1;border:1px solid #e3e3e3;border-radius:10px;padding:12px;">' +
            '<h4 style="margin:0 0 10px;font-size:14px;color:#3a3a8a;">Buffer (TikTok+IG)</h4>' +
            '<button id="pub-vid-btn" class="btn" style="width:100%;background:#3a3a8a;">Krijo video</button>' +
            '<div id="pub-vid-status" style="margin-top:8px;font-size:12px;color:#666;"></div>' +
            '<div id="pub-vid-out" style="margin-top:10px;"></div>' +
          '</div>' +
        '</div>' +
        '<button id="pub-send" class="btn btn-green" style="width:100%;margin-top:16px;" disabled>Dergo</button>' +
        '<div id="pub-msg" style="margin-top:10px;font-size:13px;color:#444;"></div>' +
      '</div>' +
    '</div>' +
 
    '<script>' +
    'var TOKEN = ' + JSON.stringify(token) + ';' +
    'var RAILWAY = ' + JSON.stringify(RAILWAY) + ';' +
 
    // ---- TABS ----
    'var tabs = document.querySelectorAll(".tab");' +
    'tabs.forEach(function(t){ t.addEventListener("click", function(){' +
    '  tabs.forEach(function(x){ x.classList.remove("active"); });' +
    '  document.querySelectorAll(".panel").forEach(function(p){ p.classList.remove("active"); });' +
    '  t.classList.add("active");' +
    '  document.getElementById("tab-" + t.getAttribute("data-tab")).classList.add("active");' +
    '}); });' +
 
    // ---- DIZAJNET ----
    'var genBtn = document.getElementById("gen-btn");' +
    'var statusEl = document.getElementById("status");' +
    'var grid = document.getElementById("grid");' +
    'genBtn.addEventListener("click", function () {' +
    '  var count = parseInt(document.getElementById("count").value, 10) || 1;' +
    '  if (count < 1) count = 1; if (count > 20) count = 20;' +
    '  genBtn.disabled = true; grid.innerHTML = "";' +
    '  generateNext(0, count, "/admin/generate-one");' +
    '});' +
    'var genTextBtn = document.getElementById("gen-text-btn");' +
    'genTextBtn.addEventListener("click", function () {' +
    '  var count = parseInt(document.getElementById("count-text").value, 10) || 1;' +
    '  if (count < 1) count = 1; if (count > 20) count = 20;' +
    '  genTextBtn.disabled = true; grid.innerHTML = "";' +
    '  generateNext(0, count, "/admin/generate-text-one");' +
    '});' +
    'function generateNext(i, total, endpoint) {' +
    '  if (i >= total) { statusEl.textContent = "Perfunduan " + total + "."; genBtn.disabled = false; genTextBtn.disabled = false; loadPending(); return; }' +
    '  statusEl.textContent = "Po gjenerohet " + (i+1) + " nga " + total + "...";' +
    '  fetch(endpoint + "?token=" + encodeURIComponent(TOKEN))' +
    '    .then(function (r) { return r.json(); })' +
    '    .then(function (res) { if (!res.ok) { addError(res.error || "Gabim"); } generateNext(i + 1, total, endpoint); })' +
    '    .catch(function () { addError("Nuk u lidh dot"); generateNext(i + 1, total, endpoint); });' +
    '}' +
    'function addError(msg) {' +
    '  var d = document.createElement("div");' +
    '  d.style.cssText = "background:#fdecea;border:1px solid #f5c6cb;border-radius:8px;padding:12px;color:#a12;";' +
    '  d.textContent = msg; grid.appendChild(d);' +
    '}' +
    'function addSavedCard(d) {' +
    '  var card = document.createElement("div"); card.className = "card";' +
    '  card.innerHTML =' +
    '    \'<img src="\' + d.image_url + \'" style="width:100%;border-radius:8px;background:#eee;">\' +' +
    '    \'<p style="font-size:13px;color:#444;margin:8px 0 8px;font-weight:600;">\' + (d.caption_sq || d.caption || "") + \'</p>\' +' +
    '    \'<div style="display:flex;gap:8px;">\' +' +
    '      \'<button class="approve btn btn-green" style="flex:1;padding:8px;">Prano</button>\' +' +
    '      \'<button class="reject btn-light" style="flex:1;padding:8px;border-radius:6px;">Refuzo</button>\' +' +
    '    \'</div>\';' +
    '  var approve = card.querySelector(".approve");' +
    '  var reject = card.querySelector(".reject");' +
    '  reject.addEventListener("click", function () {' +
    '    reject.textContent = "..."; reject.disabled = true;' +
    '    fetch("/admin/reject?id=" + d.id + "&token=" + encodeURIComponent(TOKEN))' +
    '      .then(function (r) { return r.json(); })' +
    '      .then(function (res) { if (res.ok) { card.remove(); } else { reject.textContent = "Gabim"; reject.disabled = false; } })' +
    '      .catch(function () { reject.textContent = "Gabim"; reject.disabled = false; });' +
    '  });' +
    '  approve.addEventListener("click", function () { openApproveModal(d); });' +
    '  grid.appendChild(card);' +
    '}' +
    'function openApproveModal(d) {' +
    '  document.getElementById("modal-img").src = d.image_url;' +
    '  document.getElementById("modal-text").textContent = (d.caption_sq || d.caption || "");' +
    '  var overlay = document.getElementById("modal-overlay");' +
    '  var msg = document.getElementById("modal-msg"); msg.textContent = "";' +
    '  overlay.style.display = "flex";' +
    '  var confirmBtn = document.getElementById("modal-confirm");' +
    '  var cancelBtn = document.getElementById("modal-cancel");' +
    '  cancelBtn.onclick = function () { overlay.style.display = "none"; };' +
    '  confirmBtn.disabled = false; confirmBtn.textContent = "Konfirmo";' +
    '  confirmBtn.onclick = function () {' +
    '    confirmBtn.disabled = true; confirmBtn.textContent = "Po krijohet..."; msg.textContent = "";' +
    '    fetch("/admin/approve?id=" + d.id + "&position=front&token=" + encodeURIComponent(TOKEN))' +
    '      .then(function (r) { return r.json(); })' +
    '      .then(function (res) {' +
    '        if (res.ok) { overlay.style.display = "none"; loadPending(); }' +
    '        else { msg.textContent = "Gabim: " + (res.error || ""); confirmBtn.disabled = false; confirmBtn.textContent = "Provo prap"; }' +
    '      })' +
    '      .catch(function () { msg.textContent = "Nuk u lidh dot."; confirmBtn.disabled = false; confirmBtn.textContent = "Provo prap"; });' +
    '  };' +
    '}' +
    'function addApprovedCard(d) {' +
    '  var card = document.createElement("div"); card.className = "card";' +
    '  card.innerHTML =' +
    '    \'<img src="\' + d.image_url + \'" style="width:100%;border-radius:8px;background:#eee;">\' +' +
    '    \'<p style="font-size:13px;color:#444;margin:8px 0 4px;font-weight:600;">\' + (d.caption_sq || d.caption || "") + \'</p>\' +' +
    '    \'<p style="font-size:11px;color:#1a7f37;margin:0;">✓ Produkt i krijuar\' + (d.printify_product_id ? (" #" + d.printify_product_id) : "") + \'</p>\';' +
    '  approvedGrid.appendChild(card);' +
    '}' +
    'function loadApproved() {' +
    '  approvedGrid.innerHTML = "";' +
    '  fetch("/admin/approved?token=" + encodeURIComponent(TOKEN))' +
    '    .then(function (r) { return r.json(); })' +
    '    .then(function (res) {' +
    '      if (res.ok && res.designs) {' +
    '        if (res.designs.length === 0) { approvedGrid.innerHTML = \'<p style="color:#888;">Ende asnje dizajn i pranuar.</p>\'; }' +
    '        else { res.designs.forEach(addApprovedCard); }' +
    '      }' +
    '    }).catch(function () {});' +
    '}' +
    'var mainView = document.getElementById("main-view");' +
    'var approvedView = document.getElementById("approved-view");' +
    'var approvedGrid = document.getElementById("approved-grid");' +
    'document.getElementById("show-approved").addEventListener("click", function () {' +
    '  mainView.style.display = "none"; approvedView.style.display = "block"; loadApproved();' +
    '});' +
    'document.getElementById("back-btn").addEventListener("click", function () {' +
    '  approvedView.style.display = "none"; mainView.style.display = "block";' +
    '});' +
    'function loadPending() {' +
    '  grid.innerHTML = "";' +
    '  fetch("/admin/pending?token=" + encodeURIComponent(TOKEN))' +
    '    .then(function (r) { return r.json(); })' +
    '    .then(function (res) { if (res.ok && res.designs) { res.designs.forEach(addSavedCard); } })' +
    '    .catch(function () {});' +
    '}' +
    'loadPending();' +
 
    // ---- URDHERAT ----
    'var ordCarousel = document.getElementById("ord-carousel");' +
    'var ordFull = document.getElementById("ord-full");' +
    'var ordFullGrid = document.getElementById("ord-full-grid");' +
    'function ordCard(d, compact){' +
    '  var card = document.createElement("div");' +
    '  card.className = "card";' +
    '  if(compact){ card.style.cssText = "background:#fff;border:1px solid #e3e3e3;border-radius:8px;padding:8px;min-width:130px;max-width:130px;flex:0 0 auto;"; }' +
    '  var badge = (d.status === "approved") ? \'<span style="font-size:10px;color:#1a7f37;">✓ Prodhuar</span>\' : \'<span style="font-size:10px;color:#a67;">Ne pritje</span>\';' +
    '  card.innerHTML =' +
    '    \'<img src="\' + d.image_url + \'" style="width:100%;border-radius:8px;background:#eee;">\' +' +
    '    \'<p style="font-size:12px;color:#444;margin:6px 0 4px;font-weight:600;">\' + (d.caption_sq || d.caption || "") + \'</p>\' +' +
    '    badge +' +
    '    \'<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">\' +' +
    '      \'<button class="o-approve btn btn-green" style="flex:1;padding:6px;font-size:12px;">Prano</button>\' +' +
    '      \'<button class="o-reject btn-light" style="flex:1;padding:6px;border-radius:6px;font-size:12px;">Hiq</button>\' +' +
    '    \'</div>\' +' +
    '    \'<button class="o-pub btn" style="width:100%;margin-top:6px;padding:6px;font-size:12px;background:#3a3a8a;">Publiko</button>\';' +
    '  card.querySelector(".o-approve").addEventListener("click", function(){ openApproveModal(d); });' +
    '  card.querySelector(".o-reject").addEventListener("click", function(){' +
    '    fetch("/admin/reject?id=" + d.id + "&token=" + encodeURIComponent(TOKEN)).then(function(r){return r.json();}).then(function(res){ if(res.ok){ card.remove(); } });' +
    '  });' +
    '  card.querySelector(".o-pub").addEventListener("click", function(){ openPubModal(d); });' +
    '  return card;' +
    '}' +
    'function loadOrders(){' +
    '  ordCarousel.innerHTML = "";' +
    '  fetch("/admin/all?token=" + encodeURIComponent(TOKEN)).then(function(r){return r.json();}).then(function(res){' +
    '    if(res.ok && res.designs){' +
    '      if(res.designs.length === 0){ ordCarousel.innerHTML = \'<p style="color:#888;">Ende asnje dizajn.</p>\'; }' +
    '      else { res.designs.forEach(function(d){ ordCarousel.appendChild(ordCard(d, true)); }); }' +
    '    }' +
    '  }).catch(function(){});' +
    '}' +
    'document.getElementById("ord-all-btn").addEventListener("click", function(){' +
    '  document.getElementById("ord-home").style.display = "none";' +
    '  ordFull.style.display = "block"; ordFullGrid.innerHTML = "";' +
    '  fetch("/admin/all?token=" + encodeURIComponent(TOKEN)).then(function(r){return r.json();}).then(function(res){' +
    '    if(res.ok && res.designs){ res.designs.forEach(function(d){ ordFullGrid.appendChild(ordCard(d, false)); }); }' +
    '  }).catch(function(){});' +
    '});' +
    'document.getElementById("ord-back").addEventListener("click", function(){ ordFull.style.display = "none"; document.getElementById("ord-home").style.display = "block"; });' +
    'var pubState = { design: null, mockupUrl: null, videoUrl: null, videoCaption: null, videoAnimal: null };' +
    'function openPubModal(d){' +
    '  pubState = { design: d, mockupUrl: null, videoUrl: null, videoCaption: null, videoAnimal: null };' +
    '  document.getElementById("pub-msg").textContent = "";' +
    '  document.getElementById("pub-pin-when").value = "";' +
    '  document.getElementById("pub-buf-when").value = "";' +
    '  document.getElementById("pub-mock-out").innerHTML = "";' +
    '  document.getElementById("pub-vid-out").innerHTML = "";' +
    '  document.getElementById("pub-vid-status").textContent = "";' +
    '  updatePubSend();' +
    '  var ov = document.getElementById("pub-overlay"); ov.style.display = "flex";' +
    '  document.getElementById("pub-x").onclick = function(){ ov.style.display = "none"; };' +
    '}' +
    // shenja =
    'document.getElementById("pub-eq").addEventListener("click", function(){' +
    '  var p = document.getElementById("pub-pin-when").value;' +
    '  var b = document.getElementById("pub-buf-when").value;' +
    '  var v = p || b;' +
    '  if(v){ document.getElementById("pub-pin-when").value = v; document.getElementById("pub-buf-when").value = v; }' +
    '});' +
    // krijo mockup (perdor dizajnin e klikuar)
    'document.getElementById("pub-mock-btn").addEventListener("click", function(){' +
    '  var out = document.getElementById("pub-mock-out"); out.innerHTML = "Po krijohet...";' +
    '  pubState.mockupUrl = null; updatePubSend();' +
    '  var u = RAILWAY + "/pinterest/mockup-url?image=" + encodeURIComponent(pubState.design.image_url) + "&t=" + Date.now();' +
    '  fetch(u).then(function(r){return r.json();}).then(function(res){' +
    '    if(res.ok && res.url){ pubState.mockupUrl = res.url; out.innerHTML = \'<img src="\' + res.url + \'" style="width:100%;border-radius:8px;">\'; updatePubSend(); }' +
    '    else { out.innerHTML = "Gabim: " + (res.error || ""); updatePubSend(); }' +
    '  }).catch(function(){ out.innerHTML = "Nuk u lidh dot."; updatePubSend(); });' +
    '});' +
    // krijo video (perdor dizajnin e klikuar)
    'document.getElementById("pub-vid-btn").addEventListener("click", function(){' +
    '  var st = document.getElementById("pub-vid-status"); var out = document.getElementById("pub-vid-out");' +
    '  st.textContent = "Po nis videon..."; out.innerHTML = "";' +
    '  fetch(RAILWAY + "/video/start?image=" + encodeURIComponent(pubState.design.image_url)).then(function(r){return r.json();}).then(function(res){' +
    '    if(!res.ok){ st.textContent = "Gabim: " + (res.error && res.error.message || JSON.stringify(res.error)); return; }' +
    '    st.textContent = "Po gjenerohet... (1-3 min)";' +
    '    pubPollVideo(res.request_id, st, out);' +
    '  }).catch(function(){ st.textContent = "Nuk u lidh dot."; });' +
    '});' +
    'function pubPollVideo(id, st, out){' +
    '  fetch(RAILWAY + "/video/check?id=" + id).then(function(r){return r.json();}).then(function(res){' +
    '    if(res.status === "COMPLETED"){' +
    '      if(res.videoUrl){ st.textContent = "Gati!"; pubState.videoUrl = res.videoUrl; pubState.videoCaption = res.caption; pubState.videoAnimal = res.animal;' +
    '        out.innerHTML = \'<video src="\' + res.videoUrl + \'" controls loop style="width:100%;border-radius:8px;"></video>\'; updatePubSend(); }' +
    '      else { st.textContent = "Perfundoi por su gjet URL."; } return;' +
    '    }' +
    '    st.textContent = "Po gjenerohet... (" + (res.status || "po pret") + ")";' +
    '    setTimeout(function(){ pubPollVideo(id, st, out); }, 6000);' +
    '  }).catch(function(){ setTimeout(function(){ pubPollVideo(id, st, out); }, 6000); });' +
    '}' +
    // a eshte zgjedhur nje kolone: orar + rezultat
    'function pinReady(){ return document.getElementById("pub-pin-when").value && pubState.mockupUrl; }' +
    'function bufReady(){ return document.getElementById("pub-buf-when").value && pubState.videoUrl; }' +
    'function updatePubSend(){ document.getElementById("pub-send").disabled = !(pinReady() || bufReady()); }' +
    'document.getElementById("pub-pin-when").addEventListener("change", updatePubSend);' +
    'document.getElementById("pub-buf-when").addEventListener("change", updatePubSend);' +
    // dergo: poston kolonat e plotesuara dhe ruan ne databaze
    'document.getElementById("pub-send").addEventListener("click", function(){' +
    '  var btn = document.getElementById("pub-send"); var msg = document.getElementById("pub-msg");' +
    '  btn.disabled = true; btn.textContent = "Po dergohet..."; msg.textContent = "";' +
    '  var chans = []; var tasks = [];' +
    '  var pinWhen = document.getElementById("pub-pin-when").value;' +
    '  var bufWhen = document.getElementById("pub-buf-when").value;' +
    '  if(pinReady()){ chans.push("pinterest");' +
    '    tasks.push(fetch(RAILWAY + "/buffer/pinterest?design=" + encodeURIComponent(pubState.mockupUrl) + "&caption=" + encodeURIComponent(pubState.design.caption || "") + "&animal=" + encodeURIComponent(pubState.design.animal || "") + "&when=" + encodeURIComponent(pinWhen)).then(function(r){return r.json();})); }' +
    '  if(bufReady()){ chans.push("buffer");' +
    '    tasks.push(fetch(RAILWAY + "/buffer/post?video=" + encodeURIComponent(pubState.videoUrl) + "&caption=" + encodeURIComponent(pubState.videoCaption || "") + "&animal=" + encodeURIComponent(pubState.videoAnimal || "") + "&when=" + encodeURIComponent(bufWhen)).then(function(r){return r.json();})); }' +
    '  Promise.all(tasks).then(function(){' +
    '    var save = RAILWAY + "/admin/publish-save?designId=" + (pubState.design.id || "") + "&image=" + encodeURIComponent(pubState.design.image_url) + "&pinterestWhen=" + encodeURIComponent(pinWhen || "") + "&bufferWhen=" + encodeURIComponent(bufWhen || "") + "&channels=" + encodeURIComponent(chans.join(","));' +
    '    return fetch(save).then(function(r){return r.json();});' +
    '  }).then(function(){' +
    '    btn.textContent = "Derguar ✓"; msg.textContent = "U planifikua: " + chans.join(" + "); loadSchedule();' +
    '  }).catch(function(){ btn.disabled = false; btn.textContent = "Dergo"; msg.textContent = "Gabim gjate dergimit."; });' +
    '});' +
    // seksioni i orareve/publikimeve te home
    'function loadSchedule(){' +
    '  var box = document.getElementById("ord-schedule");' +
    '  fetch("/admin/publications?token=" + encodeURIComponent(TOKEN)).then(function(r){return r.json();}).then(function(res){' +
    '    if(res.ok && res.publications && res.publications.length){' +
    '      box.innerHTML = "";' +
    '      res.publications.forEach(function(p){' +
    '        var row = document.createElement("div");' +
    '        row.style.cssText = "display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f0f0f0;";' +
    '        row.innerHTML = \'<img src="\' + (p.image_url||"") + \'" style="width:36px;height:36px;border-radius:6px;object-fit:cover;background:#eee;">\' + \'<span style="font-size:12px;color:#444;">\' + (p.channels||"") + \'</span>\' + \'<span style="font-size:11px;color:#888;margin-left:auto;">\' + (p.pinterest_when||p.buffer_when||"") + \'</span>\';' +
    '        box.appendChild(row);' +
    '      });' +
    '    } else { box.innerHTML = \'<span style="color:#888;">Ende asnje publikim.</span>\'; }' +
    '  }).catch(function(){});' +
    '}' +
    'loadSchedule();' +
    'loadOrders();' +
 
    // ---- MOCKUPET ----
    'var mockBtn = document.getElementById("mock-btn");' +
    'var mockOut = document.getElementById("mock-out");' +
    'mockBtn.addEventListener("click", function(){' +
    '  mockOut.innerHTML = "Po krijohet...";' +
    '  var url = RAILWAY + "/pinterest/test-mockup?t=" + Date.now();' +
    '  var img = new Image();' +
    '  img.onload = function(){ mockOut.innerHTML = ""; img.style.cssText = "max-width:360px;width:100%;border-radius:12px;"; mockOut.appendChild(img); };' +
    '  img.onerror = function(){ mockOut.innerHTML = "Gabim ne krijimin e mockup-it."; };' +
    '  img.src = url;' +
    '});' +
    'var pinPostBtn = document.getElementById("pin-post-btn");' +
    'var pinPostMsg = document.getElementById("pin-post-msg");' +
    'pinPostBtn.addEventListener("click", function(){' +
    '  pinPostBtn.disabled = true; pinPostBtn.textContent = "Po planifikohet..."; pinPostMsg.textContent = "";' +
    '  var w = document.getElementById("pin-when").value;' +
    '  var u = RAILWAY + "/buffer/pinterest" + (w ? ("?when=" + encodeURIComponent(w)) : "");' +
    '  fetch(u).then(function(r){return r.json();}).then(function(res){' +
    '    if(res.ok){ pinPostBtn.textContent = "Planifikuar ne Pinterest ✓"; pinPostMsg.textContent = "Titulli: " + (res.title || "") + " | Ora: " + (res.dueAt || ""); }' +
    '    else { pinPostBtn.disabled = false; pinPostBtn.textContent = "Provo prap"; pinPostMsg.textContent = "Gabim: " + (res.error || ""); }' +
    '  }).catch(function(){ pinPostBtn.disabled = false; pinPostBtn.textContent = "Provo prap"; pinPostMsg.textContent = "Nuk u lidh dot."; });' +
    '});' +
 
    // ---- VIDEOT ----
    'var vidBtn = document.getElementById("vid-btn");' +
    'var vidStatus = document.getElementById("vid-status");' +
    'var vidScene = document.getElementById("vid-scene");' +
    'var vidOut = document.getElementById("vid-out");' +
    'vidBtn.addEventListener("click", function(){' +
    '  vidBtn.disabled = true; vidOut.innerHTML = ""; vidScene.textContent = "";' +
    '  vidStatus.textContent = "Po nis videon...";' +
    '  fetch(RAILWAY + "/video/start").then(function(r){return r.json();}).then(function(res){' +
    '    if(!res.ok){ vidStatus.textContent = "Gabim: " + (res.error && res.error.message || JSON.stringify(res.error)); vidBtn.disabled = false; return; }' +
    '    if(res.skena){ vidScene.textContent = "Skena: " + res.skena; }' +
    '    vidStatus.textContent = "Po gjenerohet... (1-3 min)";' +
    '    pollVideo(res.request_id);' +
    '  }).catch(function(){ vidStatus.textContent = "Nuk u lidh dot."; vidBtn.disabled = false; });' +
    '});' +
    'function pollVideo(id){' +
    '  fetch(RAILWAY + "/video/check?id=" + id).then(function(r){return r.json();}).then(function(res){' +
    '    if(res.status === "COMPLETED"){' +
    '      if(res.videoUrl){ vidStatus.textContent = "Gati!";' +
    '        vidOut.innerHTML = \'<video src="\' + res.videoUrl + \'" controls autoplay loop style="max-width:360px;width:100%;border-radius:12px;"></video>\' + \'<br><a href="\' + res.videoUrl + \'" target="_blank" class="btn btn-green" style="display:inline-block;margin-top:12px;text-decoration:none;">Hap / Shkarko</a>\' + \' <button id="send-buffer" class="btn" style="margin-top:12px;">Dergo ne Buffer</button>\' + \'<div id="buffer-msg" style="margin-top:8px;font-size:13px;color:#444;"></div>\';' +
    '        var sendBtn = document.getElementById("send-buffer");' +
    '        var bmsg = document.getElementById("buffer-msg");' +
    '        sendBtn.addEventListener("click", function(){' +
    '          sendBtn.disabled = true; sendBtn.textContent = "Po dergohet..."; bmsg.textContent = "";' +
    '          var w = document.getElementById("vid-when").value;' +
    '          var u = RAILWAY + "/buffer/post?video=" + encodeURIComponent(res.videoUrl) + "&caption=" + encodeURIComponent(res.caption || "") + "&animal=" + encodeURIComponent(res.animal || "") + (w ? ("&when=" + encodeURIComponent(w)) : "");' +
    '          fetch(u).then(function(r){return r.json();}).then(function(b){' +
    '            if(b.ok){ sendBtn.textContent = "Planifikuar ✓"; bmsg.textContent = "TikTok + Instagram, ora: " + (b.dueAt || ""); }' +
    '            else { sendBtn.disabled = false; sendBtn.textContent = "Provo prap"; bmsg.textContent = "Gabim: " + (b.error || ""); }' +
    '          }).catch(function(){ sendBtn.disabled = false; sendBtn.textContent = "Provo prap"; bmsg.textContent = "Nuk u lidh dot."; });' +
    '        });' +
    '      } else { vidStatus.textContent = "Perfundoi por su gjet URL."; }' +
    '      vidBtn.disabled = false; return;' +
    '    }' +
    '    vidStatus.textContent = "Po gjenerohet... (" + (res.status || "po pret") + ")";' +
    '    setTimeout(function(){ pollVideo(id); }, 6000);' +
    '  }).catch(function(){ setTimeout(function(){ pollVideo(id); }, 6000); });' +
    '}' +
 
    '</script></body></html>';
}
 
module.exports = { router };
