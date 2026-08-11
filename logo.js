// logo.js — Router per REDAKTIMIN e imazhit REAL (logo-baza.png, skedar i veçantë krah këtij).
// Asnjë base64 i ngjitur brenda kodit — lexohet nga disku, skedar normal, i vogël, hapet menjëherë.

const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const PROMPT = `Keep this circular owl logo almost exactly as it is — same composition, same circular frame, same
owl head, same key, same colors, same cropping. This design is already correct; only refine it lightly.

Make it slightly cleaner and more minimalist: smooth and tidy the linework, remove any small messy or awkward
details, make the shapes a bit more confident and balanced — but do NOT redesign it, do NOT add complexity, and
do NOT change the composition, the owl's recognizable features (ear tufts, facial disc, ringed eye), the single
visible eye, the open beak, or the key gripped through the middle of its shaft.

The result should look like a polished, professional, minimal circular logo badge for a global company — the same
design as now, just cleaner and more refined.`;

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
