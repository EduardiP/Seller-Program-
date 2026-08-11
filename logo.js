// logo.js — Router per gjenerimin e logos se bufit me AI (OpenAI gpt-image-1).
// I ndertuar sipas te njejtit model si auth.js/admin.js/etj — eksporton { router }.

const express = require('express');
const router = express.Router();

const LINK_KRAHET = 'https://screeneasy.co.uk/wp-content/uploads/2020/08/Angel-Wings1.svg';
const LINK_KOKA = 'https://t3.ftcdn.net/jpg/05/48/51/68/360_F_548516853_gD2YNJOqnJrCwES7t7m3ZrWwX9bHfSGI.jpg';

// Merr nje imazh nga interneti dhe e kthen ne base64 data-URI (per ta dhene te GPT-4o si input vizual).
// SVG kthehet ne PNG paraprakisht (GPT-4o s'pranon SVG), permes nje sherbimi te lire konvertimi, pa varesi te reja.
async function merrImazhinBase64(url) {
  let urlPerFetch = url;
  if (url.toLowerCase().endsWith('.svg')) {
    const pastrUrl = url.replace(/^https?:\/\//, '');
    urlPerFetch = `https://images.weserv.nl/?url=${encodeURIComponent(pastrUrl)}&output=png&w=800`;
  }
  const r = await fetch(urlPerFetch);
  if (!r.ok) throw new Error(`S'u mor imazhi (${url}): ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const contentType = urlPerFetch === url ? (r.headers.get('content-type') || 'image/png') : 'image/png';
  return `data:${contentType};base64,${buf.toString('base64')}`;
}

// Hapi 1 — GPT-4o (shikim) pershkruan SAKTE pozicionin e krahëve dhe kokes nga vete imazhet
async function pershkrimNgaImazhet(OPENAI_API_KEY) {
  const [krahetB64, kokaB64] = await Promise.all([
    merrImazhinBase64(LINK_KRAHET),
    merrImazhinBase64(LINK_KOKA)
  ]);

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Imazhi i pare tregon pozicionin e krahëve (si engjëll). Përshkruaj saktësisht ' +
            'këndin dhe formën e krahëve — sa të hapur janë, drejtimin e tyre, formën e pendëve — në anglisht, ' +
            'për t\'ia dhënë si udhëzim një AI-je gjeneruese imazhesh. Imazhi i dytë tregon këndin e kokës që duam ' +
            '(kokë e kthyer pjesërisht anash, jo profil i plotë). Përshkruaje edhe atë saktësisht: sa gradë e ' +
            'kthyer, çfarë duket nga syri/fytyra. Përgjigju me dy paragrafë të shkurtër, vetëm përshkrimet, në anglisht.' },
          { type: 'image_url', image_url: { url: krahetB64 } },
          { type: 'image_url', image_url: { url: kokaB64 } }
        ]
      }]
    })
  });
  const data = await r.json();
  if (!r.ok) throw new Error('Gabim nga GPT-4o (shikim): ' + JSON.stringify(data));
  return data.choices[0].message.content;
}

router.get('/gjenero-logo-buf', async (req, res) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return res.status(500).send('OPENAI_API_KEY mungon.');

  let pershkrimVizual;
  try {
    pershkrimVizual = await pershkrimNgaImazhet(OPENAI_API_KEY);
  } catch (e) {
    return res.status(500).send(`<pre style="white-space:pre-wrap;background:#111;color:#f85149;padding:20px;">Gabim duke lexuar imazhet e referencës:\n\n${e.message}</pre>`);
  }

  const PROMPT = `A vector illustration logo of a single owl, designed in the same visual tradition and level of ornate
detail as the Great Seal of the United States — an heraldic engraved seal design, with fine linework and
cross-hatched shading for depth and dimension, NOT a flat minimal icon and NOT oversimplified. It should read
as a detailed, somewhat realistic engraved emblem — vector-style artwork, not a flat cartoon icon, and not a
full photograph either. Standalone brand logo mark on a plain solid background.

Do NOT copy the Great Seal's actual content — no eagle, no shield, no arrows, no olive branch, no stars, no
banner text. Only borrow its formal, symmetrical, engraved-seal AESTHETIC and level of linework detail, applied
to an original owl subject instead.

The owl's wings and head pose must match this precise visual reference (verified by looking directly at the
reference images): ${pershkrimVizual}
Adapt these positions to a real owl's proportions and natural feather shapes — not literal angel feathers, not
a literal human face — just the ANGLE and POSE described above, applied to an owl.

Inside that visible eye, a small ornate vintage key shape is incorporated as part of the eye's design (the key
reads as the pupil/iris detail). The owl's beak is open (not closed), and a second matching key shape sits inside
the open beak, as if held or visible through it.

This is a standalone logo/brand icon only. Do NOT present it as a t-shirt print, a badge with a text ring, a full
scene, or a mockup on any product or surface.`;

  try {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: PROMPT,
        n: 1,
        size: '1024x1024',
        quality: 'medium'
      })
    });
    const data = await r.json();

    if (!r.ok) {
      return res.status(500).send(`<pre style="white-space:pre-wrap;background:#111;color:#f85149;padding:20px;">Gabim nga OpenAI:\n\n${JSON.stringify(data, null, 2)}</pre>`);
    }

    const b64 = data.data && data.data[0] && data.data[0].b64_json;
    if (!b64) {
      return res.status(500).send(`<pre style="white-space:pre-wrap;background:#111;color:#4a9eff;padding:20px;">PËRGJIGJA E VËRTETË (per te gjetur fushen e sakte):\n\n${JSON.stringify(data, null, 2)}</pre>`);
    }

    res.send(`<body style="background:#111;text-align:center;padding:40px;font-family:sans-serif;">
      <img src="data:image/png;base64,${b64}" style="max-width:500px;border-radius:12px;">
    </body>`);
  } catch (e) {
    res.status(500).send('Gabim: ' + e.message);
  }
});

module.exports = { router };
