// logo.js — Router per REDAKTIMIN e imazhit REAL (logo-baza.png, skedar i veçantë krah këtij).
// Asnjë base64 i ngjitur brenda kodit — lexohet nga disku, skedar normal, i vogël, hapet menjëherë.

const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const PROMPT = `Do NOT redesign, restyle, or simplify anything. Every line, shape, color, and detail on the head,
face, key, and beak must stay exactly as they currently are — same linework density, same colors, same everything
about those parts. This is a crop-and-frame task, not a redesign.

CROP: do not include the whole owl. Only include the head, the key held in the beak, and a small amount of the
upper body/shoulders — just enough that the wings can be shown attached. Do NOT include the lower body, legs, or
feet at all.

WINGS: right now they hang flat down against the body. In this cropped version, lift them just the smallest
amount — the very first hint of starting to rise, barely separated from the body. This must NOT look like a
moderate opening and absolutely NOT a wide spread — if in doubt, keep them much closer to fully closed than to
any open position. Only a small, subtle lift, nothing more.

CIRCLE FRAME: contain this cropped composition (head, key, small bit of body, wings) within a clean circular
border/frame, like a badge or app icon, centered and sized to fill the circle naturally.

QUALITY BAR: this final circular mark should look like a polished, minimal, professional logo for a global
company — clean, confident, well-balanced, the kind of mark that works small on a favicon and large on signage.
This is about the overall polish and balance of the composition, NOT about removing or simplifying the specific
details locked in below.

Keep completely unchanged: the head turned to the side so that only one eye is visible and the other eye is not
visible at all (no key shape in the visible eye, just a normal eye),
the beak open with the same ornate key gripped through the middle of its shaft, and the exact same flat vector
color palette and rendering style as the original.`;

router.get('/gjenero-logo-buf', async (req, res) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return res.status(500).send('OPENAI_API_KEY mungon.');

  try {
    const imgBuffer = fs.readFileSync(path.join(__dirname, 'logo-baza.png'));

    const formData = new FormData();
    formData.append('image', new Blob([imgBuffer], { type: 'image/png' }), 'baza.png');
    formData.append('model', 'gpt-image-1');
    formData.append('prompt', PROMPT);
    formData.append('n', '1');
    formData.append('size', '1024x1024');

    const r = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: formData
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
