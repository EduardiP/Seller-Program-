// logo.js — Router per REDAKTIMIN e imazhit REAL (logo-baza.png, skedar i veçantë krah këtij).
// Asnjë base64 i ngjitur brenda kodit — lexohet nga disku, skedar normal, i vogël, hapet menjëherë.

const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const PROMPT = `Make this MUCH more minimalist than the current version — significantly simplified, clean, bold
shapes, very little internal linework or texture detail. Think modern minimal logo mark, not detailed illustration.
Keep the same character identity: same overall color palette, same key design, same general head shape and
features — but simplified and reduced to clean essential shapes throughout.

CROP — tight, close composition: only the head, the key held in the beak, and just a small hint of the chest —
NOT the shoulders, NOT the full upper body. The wings appear small, to the sides of that chest hint, not as large
shapes — just enough presence to suggest wings, minimal in size and detail.

WINGS: barely lifted, the smallest hint of separation from the body — NOT a moderate opening, NOT a wide spread.
Small and subtle, secondary to the head and key.

CIRCLE FRAME: contain this tight, minimal composition (head, key, small chest hint, small side wings) within a
clean circular border/frame, like a badge or app icon, centered and well-balanced within the circle.

QUALITY BAR: this should read as a polished, minimal, professional logo mark for a global company — the kind of
clean confident mark that works small on a favicon and large on signage.

Keep unchanged: the head turned to the side so that only one eye is visible and the other eye is not visible at
all (a normal eye, no key shape inside it), and the beak open with the same ornate key design gripped through the
middle of its shaft.`;

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
