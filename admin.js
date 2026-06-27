// admin.js — paneli i adminimit (brenda Shopify admin te app-i).
const express = require('express');
const { generateConcept, generateImage } = require('./ai');

const router = express.Router();

function requireAdmin(req, res, next) {
  next();
}

function buildDesignPrompt(concept) {
  return 'A vintage retro t-shirt graphic design on a fully transparent background. ' +
    'Featuring ' + concept.animal + ' with a ' + concept.expression + ' expression, ' +
    'drawn in a distressed vintage halftone screen-print style (black ink with a warm burnt-orange and cream accent color). ' +
    'Behind the animal there is a retro sunset circle with mountains and pine trees silhouette. ' +
    'The funny caption text reads exactly: "' + concept.text + '". ' +
    'The text is large, bold, hand-lettered, in a mix of grunge brush and condensed vintage fonts, ' +
    'split across multiple lines, alternating between black and burnt-orange colors, ' +
    'arranged artistically around the animal so text and animal share the space without overlapping, ' +
    'all text fully inside the frame with margin, nothing cut off. ' +
    'Highly polished professional t-shirt print design, distressed vintage texture, ' +
    'transparent background, no photo background, sticker-ready, high quality.';
}

router.get('/admin/generate-one', requireAdmin, async function (req, res) {
  try {
    const concept = await generateConcept();
    const prompt = buildDesignPrompt(concept);
    const b64 = await generateImage(prompt);
    res.json({ ok: true, concept: concept, image: b64 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, detail: e.body || null });
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
        '<button id="gen-btn" style="padding:10px 20px;background:#111;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:15px;">Gjenero</button>' +
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
    '  generateNext(0, count);' +
    '});' +
    'function generateNext(i, total) {' +
    '  if (i >= total) { statusEl.textContent = "Perfunduan " + total + " imazhe."; genBtn.disabled = false; return; }' +
    '  statusEl.textContent = "Po gjenerohet " + (i+1) + " nga " + total + "...";' +
    '  fetch("/admin/generate-one?token=" + encodeURIComponent(TOKEN))' +
    '    .then(function (r) { return r.json(); })' +
    '    .then(function (res) {' +
    '      if (res.ok) { addCard(res); } else { addError(res.error || "Gabim"); }' +
    '      generateNext(i + 1, total);' +
    '    })' +
    '    .catch(function () { addError("Nuk u lidh dot"); generateNext(i + 1, total); });' +
    '}' +
    'function addCard(res) {' +
    '  var card = document.createElement("div");' +
    '  card.style.cssText = "background:#fff;border:1px solid #e3e3e3;border-radius:10px;padding:12px;";' +
    '  card.innerHTML =' +
    '    \'<img src="data:image/png;base64,\' + res.image + \'" style="width:100%;border-radius:8px;background:#eee;">\' +' +
    '    \'<p style="font-size:13px;color:#444;margin:8px 0 4px;font-weight:600;">\' + (res.concept.text || "") + \'</p>\' +' +
    '    \'<p style="font-size:12px;color:#777;margin:0 0 8px;font-style:italic;">\' + (res.concept.albanian || "") + \'</p>\' +' +
    '    \'<div style="display:flex;gap:8px;">\' +' +
    '      \'<button class="approve" style="flex:1;padding:8px;background:#1a7f37;color:#fff;border:none;border-radius:6px;cursor:pointer;">Prano</button>\' +' +
    '      \'<button class="reject" style="flex:1;padding:8px;background:#eee;color:#333;border:none;border-radius:6px;cursor:pointer;">Refuzo</button>\' +' +
    '    \'</div>\';' +
    '  var approve = card.querySelector(".approve");' +
    '  var reject = card.querySelector(".reject");' +
    '  reject.addEventListener("click", function () { card.remove(); });' +
    '  approve.addEventListener("click", function () { approve.textContent = "Se shpejti..."; approve.disabled = true; });' +
    '  grid.appendChild(card);' +
    '}' +
    'function addError(msg) {' +
    '  var d = document.createElement("div");' +
    '  d.style.cssText = "background:#fdecea;border:1px solid #f5c6cb;border-radius:8px;padding:12px;color:#a12;";' +
    '  d.textContent = msg; grid.appendChild(d);' +
    '}' +
    '</script>' +
    '</body></html>';
}

module.exports = { router };
