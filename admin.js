// admin.js — paneli i adminimit (brenda Shopify admin te app-i).
const express = require('express');
const { generateConcept, generateImage, generateTextConcept } = require('./ai');
const { pool } = require('./db');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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
    'bold vintage retro typography with distressed texture, warm muted retro colors, condensed slab fonts',
    'clean modern minimalist typography, lots of negative space, simple elegant sans-serif, one or two colors',
    'bold statement typography, one huge word dominating, mixed font sizes, high contrast, strong impact',
    'retro 70s groovy typography, rounded funky letters, warm earthy palette, playful arrangement',
    'modern flat vector lettering, geometric clean shapes, bright confident colors, sticker-like',
    'hand-drawn doodle lettering, casual imperfect hand style, friendly and human, sketchy charm'
  ];
  var style = styles[Math.floor(Math.random() * styles.length)];
  return 'A professional TEXT-ONLY t-shirt graphic design on a fully transparent background. ' +
    'There is NO image, NO illustration, NO character — only beautifully arranged typography. ' +
    'The design shows exactly this funny slogan as the entire artwork: "' + concept.text + '". ' +
    'Style: ' + style + '. ' +
    'The lettering is large, bold, well-composed, balanced, and centered, ' +
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
    'CRITICAL LAYOUT RULE: the text and the animal must NEVER overlap. ' +
    'The text must be placed in its own clear empty area (above and/or below the animal), ' +
    'sitting directly on the transparent background, fully separated from the animal, ' +
    'never written on top of the animal, never blended into the animal. ' +
    'The text is large, bold, hand-lettered, in a mix of grunge brush and condensed vintage fonts, ' +
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

router.get('/', function (req, res) {
  const token = req.query.token || '';
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(buildAdminHtml(token));
});

function buildAdminHtml(token) {
  return '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Seller Program — Admin</title></head>' +
    '<body style="font-family:system-ui,sans-serif;margin:0;padding:24px;background:#f7f7f8;color:#111;">' +
    '<div style="max-width:1000px;margin:0 auto;">' +
      '<h1 style="margin:0 0 8px;">Admin — Gjenerimi i dizajneve</h1>' +
      '<p style="color:#666;margin:0 0 20px;">Cakto sa imazhe, gjeneroji, dhe prano ato qe te pelqejne.</p>' +
      '<div style="background:#fff;border:1px solid #e3e3e3;border-radius:10px;padding:16px;margin-bottom:20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">' +
        '<label style="font-weight:600;">Sa imazhe:</label>' +
        '<input id="count" type="number" min="1" max="20" value="3" style="width:80px;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:16px;">' +
        '<button id="gen-btn" style="padding:10px 20px;background:#111;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:15px;">Gjenero (me imazh)</button>' +
        '<span style="width:1px;height:30px;background:#ddd;"></span>' +
        '<label style="font-weight:600;">Sa tekste:</label>' +
        '<input id="count-text" type="number" min="1" max="20" value="3" style="width:80px;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:16px;">' +
        '<button id="gen-text-btn" style="padding:10px 20px;background:#3a3a8a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:15px;">Gjenero (vetem tekst)</button>' +
        '<span id="status" style="color:#666;"></span>' +
      '</div>' +
      '<div id="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;"></div>' +
    '</div>' +
    '<script>' +
    'var TOKEN = ' + JSON.stringify(token) + ';' +
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
    '    .then(function (res) {' +
    '      if (!res.ok) { addError(res.error || "Gabim"); }' +
    '      generateNext(i + 1, total, endpoint);' +
    '    })' +
    '    .catch(function () { addError("Nuk u lidh dot"); generateNext(i + 1, total, endpoint); });' +
    '}' +
    'function addError(msg) {' +
    '  var d = document.createElement("div");' +
    '  d.style.cssText = "background:#fdecea;border:1px solid #f5c6cb;border-radius:8px;padding:12px;color:#a12;";' +
    '  d.textContent = msg; grid.appendChild(d);' +
    '}' +
    'function addSavedCard(d) {' +
    '  var card = document.createElement("div");' +
    '  card.style.cssText = "background:#fff;border:1px solid #e3e3e3;border-radius:10px;padding:12px;";' +
    '  card.innerHTML =' +
    '    \'<img src="\' + d.image_url + \'" style="width:100%;border-radius:8px;background:#eee;">\' +' +
    '    \'<p style="font-size:13px;color:#444;margin:8px 0 8px;font-weight:600;">\' + (d.caption_sq || d.caption || "") + \'</p>\' +' +
    '    \'<div style="display:flex;gap:8px;">\' +' +
    '      \'<button class="approve" style="flex:1;padding:8px;background:#1a7f37;color:#fff;border:none;border-radius:6px;cursor:pointer;">Prano</button>\' +' +
    '      \'<button class="reject" style="flex:1;padding:8px;background:#eee;color:#333;border:none;border-radius:6px;cursor:pointer;">Refuzo</button>\' +' +
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
    '  approve.addEventListener("click", function () { approve.textContent = "Se shpejti..."; approve.disabled = true; });' +
    '  grid.appendChild(card);' +
    '}' +
    'function loadPending() {' +
    '  grid.innerHTML = "";' +
    '  fetch("/admin/pending?token=" + encodeURIComponent(TOKEN))' +
    '    .then(function (r) { return r.json(); })' +
    '    .then(function (res) {' +
    '      if (res.ok && res.designs) { res.designs.forEach(addSavedCard); }' +
    '    })' +
    '    .catch(function () {});' +
    '}' +
    'loadPending();' +
    '</script>' +
    '</body></html>';
}

module.exports = { router };
