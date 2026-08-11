// logo.js — Router per REDAKTIMIN e imazhit REAL (logo-baza.png, skedar i veçantë krah këtij).
// Asnjë base64 i ngjitur brenda kodit — lexohet nga disku, skedar normal, i vogël, hapet menjëherë.

const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const PROMPT = `Keep this exact owl logo's style, colors, key, and beak completely unchanged. Make three
targeted adjustments:

1. BODY: straighten the body and chest so they face directly forward toward the viewer, symmetrical left-to-right
— right now the body is angled to one side, fix that so only the head remains turned.

2. HEAD: turn the head to the side a bit MORE than it currently is, so that mostly one eye is visible rather than
both eyes — a clearer side turn than now, but still not a full 90-degree profile. The eye itself stays a completely
normal eye — no key shape, no special design inside it, just a normal eye.

3. WINGS: right now they hang down against the body — lift them slightly so they look a bit more ready to open,
a small increase from their current position — but do NOT spread them open. Just a bit more raised/alert than now.

Do not change anything else — same key gripped through its middle in the open beak, same flat vector style, same
colors, same overall design.`;

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
