// admin.js — paneli i adminimit (brenda Shopify admin te app-i).
// Gjeneron imazhe me AI, i shfaq per miratim, dhe i pranuarit i ben produkte.

const express = require('express');
const { generateConcept, generateImage, generateTextConcept } = require('./ai');
const { pool } = require('./db');
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

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';

function requireAdmin(req, res, next) {
  next();
}

// Stili i dizajnit (i njejti si te test-design-ai).
// Prompt per dizajne VETEM-TEKST (tipografi, pa imazh). AI zgjedh nje stil te shitur.
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

// API: gjeneron NJE imazh, e ngarkon te Cloudinary, e ruan te baza.
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

    res.json({
      ok: true,
      id: saved.rows[0].id,
      concept: concept,
      imageUrl: uploaded.url
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, detail: e.body || null });
  }
});

// API: kthen dizajnet pending (te ruajtura, qe presin miratim).
// API: gjeneron NJE dizajn VETEM-TEKST, e ngarkon te Cloudinary, e ruan te baza.
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

// Lista e veshjeve te lejuara per Prano (vetem t-shirt + tank top).
// Per fillim perdorim te gjithe listen e zgjedhur; do ta ngushtosh kur te konfirmosh id-te.
const APPROVE_BLUEPRINT_IDS = [
  5, 6, 9, 10, 12, 14, 15, 26, 88, 100, 139, 142, 145, 184, 279, 281,
  454, 460, 466, 518, 526, 565, 577, 605, 606, 607, 664, 706, 725, 751,
  1032, 1089, 1121, 1184, 1269, 1318, 1321, 1326, 1336, 1349, 1350, 1358,
  1382, 1459, 1484, 1575, 1585, 1669, 1942, 2039, 2835, 2840, 2842, 2856,
  2910, 2925, 2927, 2964, 3035, 3042, 3104, 3113, 3117, 4131, 4745, 5345
];

// API: PRANO — krijon produkt te Printify me veshje te rastesishme.
router.get('/admin/approve', requireAdmin, async function (req, res) {
  try {
    const id = parseInt(req.query.id, 10);
    const position = (req.query.position === 'back') ? 'back' : 'front';
    if (!id) return res.status(400).json({ ok: false, error: 'Mungon id.' });

    // Marrim dizajnin nga baza.
    const d = await pool.query('SELECT * FROM designs WHERE id = $1', [id]);
    if (d.rows.length === 0) return res.status(404).json({ ok: false, error: 'Dizajni s\'u gjet.' });
    const design = d.rows[0];

    // 1) Zgjedhim nje veshje rastesisht.
    const blueprintId = APPROVE_BLUEPRINT_IDS[Math.floor(Math.random() * APPROVE_BLUEPRINT_IDS.length)];

    // 2) Marrim print provider-in e pare te kesaj veshjeje.
    const providers = await printifyFetch('/catalog/blueprints/' + blueprintId + '/print_providers.json');
    if (!providers || providers.length === 0) throw new Error('S\'ka print provider per kete veshje.');
    const printProviderId = providers[0].id;

    // 3) Marrim variantet (ngjyra/madhesi) e ketij provider-i.
    const variantsData = await printifyFetch(
      '/catalog/blueprints/' + blueprintId + '/print_providers/' + printProviderId + '/variants.json'
    );
    const allVariants = (variantsData && variantsData.variants) || [];
    if (allVariants.length === 0) throw new Error('S\'ka variante per kete veshje.');
    const variantIds = allVariants.map(function (v) { return v.id; });

    // 4) Ngarkojme imazhin (nga Cloudinary URL) te Printify.
    const uploaded = await printifyFetch('/uploads/images.json', {
      method: 'POST',
      body: { file_name: 'design-' + id + '.png', url: design.image_url }
    });
    const imageId = uploaded.id;

    // 5) Krijojme produktin (draft).
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

    // 6) Perditesojme statusin e dizajnit.
    await pool.query(
      `UPDATE designs SET status = 'approved', printify_product_id = $1 WHERE id = $2`,
      [String(created.id), id]
    );

    res.json({ ok: true, productId: created.id, blueprintId: blueprintId });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, detail: e.body || null });
  }
});

// API: kthen dizajnet e PRANUARA (approved).
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

// API: REFUZO — fshin imazhin nga Cloudinary dhe rreshtin nga databaza.
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

// FAQJA e panelit.
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

      '<div id="main-view">' +
        '<button id="show-approved" style="margin-bottom:16px;padding:8px 16px;background:#fff;border:1px solid #ccc;border-radius:8px;cursor:pointer;font-size:14px;">📁 Te pranuarat</button>' +
        '<div id="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;"></div>' +
      '</div>' +

      '<div id="approved-view" style="display:none;">' +
        '<button id="back-btn" style="margin-bottom:16px;padding:8px 14px;background:#fff;border:1px solid #ccc;border-radius:8px;cursor:pointer;font-size:16px;">↰ Kthehu</button>' +
        '<h2 style="margin:0 0 16px;font-size:18px;">Dizajnet e pranuara</h2>' +
        '<div id="approved-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;"></div>' +
      '</div>' +
    '</div>' +

    '<div id="modal-overlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);align-items:center;justify-content:center;z-index:1000;">' +
      '<div style="background:#fff;border-radius:12px;padding:20px;max-width:360px;width:90%;text-align:center;">' +
        '<h3 style="margin:0 0 12px;">Prano dizajnin?</h3>' +
        '<img id="modal-img" src="" style="width:100%;border-radius:8px;background:#eee;margin-bottom:10px;">' +
        '<p id="modal-text" style="font-size:13px;color:#444;margin:0 0 12px;font-weight:600;"></p>' +
        '<p id="modal-msg" style="font-size:12px;color:#a12;margin:0 0 12px;"></p>' +
        '<div style="display:flex;gap:8px;">' +
          '<button id="modal-confirm" style="flex:1;padding:10px;background:#1a7f37;color:#fff;border:none;border-radius:6px;cursor:pointer;">Konfirmo</button>' +
          '<button id="modal-cancel" style="flex:1;padding:10px;background:#eee;color:#333;border:none;border-radius:6px;cursor:pointer;">Anulo</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<script>' +
    'var TOKEN = ' + JSON.stringify(token) + ';' +
    'var genBtn = document.getElementById("gen-btn");' +
    'var statusEl = document.getElementById("status");' +
    'var grid = document.getElementById("grid");' +

    'genBtn.addEventListener("click", function () {' +
    '  var count = parseInt(document.getElementById("count").value, 10) || 1;' +
    '  if (count < 1) count = 1; if (count > 20) count = 20;' +
    '  genBtn.disabled = true;' +
    '  grid.innerHTML = "";' +
    '  generateNext(0, count, "/admin/generate-one");' +
    '});' +

    'var genTextBtn = document.getElementById("gen-text-btn");' +
    'genTextBtn.addEventListener("click", function () {' +
    '  var count = parseInt(document.getElementById("count-text").value, 10) || 1;' +
    '  if (count < 1) count = 1; if (count > 20) count = 20;' +
    '  genTextBtn.disabled = true;' +
    '  grid.innerHTML = "";' +
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

    'function addCard(res) {' +
    '  var card = document.createElement("div");' +
    '  card.style.cssText = "background:#fff;border:1px solid #e3e3e3;border-radius:10px;padding:12px;";' +
    '  card.innerHTML =' +
    '    \'<img src="\' + res.imageUrl + \'" style="width:100%;border-radius:8px;background:#eee;">\' +' +
    '    \'<p style="font-size:13px;color:#444;margin:8px 0 8px;font-weight:600;">\' + (res.concept.albanian || res.concept.text || "") + \'</p>\' +' +
    '    \'<div style="display:flex;gap:8px;">\' +' +
    '      \'<button class="approve" style="flex:1;padding:8px;background:#1a7f37;color:#fff;border:none;border-radius:6px;cursor:pointer;">Prano</button>\' +' +
    '      \'<button class="reject" style="flex:1;padding:8px;background:#eee;color:#333;border:none;border-radius:6px;cursor:pointer;">Refuzo</button>\' +' +
    '    \'</div>\';' +
    '  var approve = card.querySelector(".approve");' +
    '  var reject = card.querySelector(".reject");' +
    '  reject.addEventListener("click", function () { card.remove(); });' +
    '  approve.addEventListener("click", function () {' +
    '    approve.textContent = "Se shpejti..."; approve.disabled = true;' +
    '  });' +
    '  grid.appendChild(card);' +
    '}' +

    'function addError(msg) {' +
    '  var d = document.createElement("div");' +
    '  d.style.cssText = "background:#fdecea;border:1px solid #f5c6cb;border-radius:8px;padding:12px;color:#a12;";' +
    '  d.textContent = msg;' +
    '  grid.appendChild(d);' +
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
    '  approve.addEventListener("click", function () { openApproveModal(d); });' +
    '  grid.appendChild(card);' +
    '}' +

    'function openApproveModal(d) {' +
    '  document.getElementById("modal-img").src = d.image_url;' +
    '  document.getElementById("modal-text").textContent = (d.caption_sq || d.caption || "");' +
    '  var overlay = document.getElementById("modal-overlay");' +
    '  var msg = document.getElementById("modal-msg");' +
    '  msg.textContent = "";' +
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
    '  var card = document.createElement("div");' +
    '  card.style.cssText = "background:#fff;border:1px solid #e3e3e3;border-radius:10px;padding:12px;";' +
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
    '    })' +
    '    .catch(function () {});' +
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

