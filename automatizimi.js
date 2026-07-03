// automatizimi.js — eksperiment: dergimi i email-eve me Resend.
const express = require('express');
const router = express.Router();

const RESEND_KEY = process.env.RESEND_KEY;
const RESEND_URL = 'https://api.resend.com/emails';

// Ku te dergohet email-i (adresa jote). Vendose te Railway si EMAIL_TO.
const EMAIL_TO = process.env.EMAIL_TO || '';

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

// TEST: dergon nje email test.
router.get('/auto/test-email', async function (req, res) {
  try {
    if (!RESEND_KEY) return res.status(500).json({ ok: false, error: 'Mungon RESEND_KEY te Railway.' });
    const to = req.query.to || EMAIL_TO;
    if (!to) return res.status(400).json({ ok: false, error: 'Mungon adresa (EMAIL_TO te Railway ose ?to=email).' });

    const html =
      '<div style="font-family:system-ui,sans-serif;padding:20px;">' +
      '<h2>Test nga Seller Program</h2>' +
      '<p>Nese e lexon kete, email-i funksionon! 🎉</p>' +
      '</div>';

    const result = await sendEmail(to, 'Test — Seller Program', html);
    res.json({ ok: result.ok, response: result.data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = { router, sendEmail };
