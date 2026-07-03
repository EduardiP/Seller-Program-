// automatizimi.js — eksperiment: email me buton qe kthen sinjal.
const express = require('express');
const router = express.Router();
 
const RESEND_KEY = process.env.RESEND_KEY;
const RESEND_URL = 'https://api.resend.com/emails';
const EMAIL_TO = process.env.EMAIL_TO || '';
const APP_URL = 'https://seller-program-production.up.railway.app';
 
// Ndihmes: dergon nje email.
async function sendEmail(to, subject, html) {
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + RESEND_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Seller Program <onboarding@resend.dev>',
      to: to,
      subject: subject,
      html: html
    })
  });
  const data = await res.json();
  return { ok: res.ok, data: data };
}
 
// TEST: dergon nje email ME BUTON qe kthen sinjal.
router.get('/auto/test-email', async function (req, res) {
  try {
    if (!RESEND_KEY) return res.status(500).json({ ok: false, error: 'Mungon RESEND_KEY te Railway.' });
    const to = req.query.to || EMAIL_TO;
    if (!to) return res.status(400).json({ ok: false, error: 'Mungon adresa.' });
 
    // nje id shembull (me vone do jete id e dizajnit)
    const id = '123';
    const approveUrl = APP_URL + '/auto/approve?id=' + id;
 
    const html =
      '<div style="font-family:system-ui,sans-serif;padding:24px;max-width:480px;margin:0 auto;">' +
      '<h2 style="margin:0 0 12px;">Dizajn i ri per miratim</h2>' +
      '<p style="color:#555;">Kliko butonin per te pranuar dhe nisur procesin.</p>' +
      '<a href="' + approveUrl + '" style="display:inline-block;margin-top:12px;padding:12px 28px;background:#1a7f37;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Prano</a>' +
      '</div>';
 
    const result = await sendEmail(to, 'Dizajn i ri — Prano?', html);
    res.json({ ok: result.ok, response: result.data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
 
// SINJALI: kur klikohet butoni "Prano" te email-i.
router.get('/auto/approve', async function (req, res) {
  const id = req.query.id || '';
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1"></head>' +
    '<body style="font-family:system-ui,sans-serif;text-align:center;padding:60px 20px;">' +
    '<h1 style="color:#1a7f37;">U pranua! ✓</h1>' +
    '<p style="color:#555;">Dizajni #' + id + ' u pranua. (Ketu do niset procesi automatik me vone.)</p>' +
    '</body></html>'
  );
});
 
module.exports = { router, sendEmail };
