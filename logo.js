// logo.js — Router per gjenerimin e logos se bufit me AI (OpenAI gpt-image-1).
// I ndertuar sipas te njejtit model si auth.js/admin.js/etj — eksporton { router }.

const express = require('express');
const router = express.Router();

router.get('/gjenero-logo-buf', async (req, res) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return res.status(500).send('OPENAI_API_KEY mungon.');

  const PROMPT = `A detailed vector emblem logo of a single owl — more intricate and layered than a flat minimal icon,
with clean vector shapes and confident linework showing real feather detail and shading through layered flat
tones (not gradients, not photographic texture, not a realistic engraving) — a middle ground between a simple
flat icon and a fully realistic illustration. Ornate, crest-like, emblematic — like a detailed heraldic badge,
rendered as clean vector art. Standalone brand logo mark on a plain solid background. No text, no banner, no
shield, no eagle — an original owl design only.

BODY ORIENTATION: the owl's body and chest face straight forward, front-on, symmetrical and upright. Only the
head is turned to the side — the body itself does NOT turn or angle away from the viewer.

HEAD: turned to the side, but only partially, showing mostly one eye rather than a full front-facing face or a
full side profile.

WING POSITION — this is critical: the wings are raised only slightly, just beginning a wingbeat. The tip of each
wing must reach NO HIGHER than the top of the owl's head — wingtips stay level with or below the head, spreading
outward and slightly upward from the shoulders. Do NOT let the wingtips rise above the head. Do NOT form a tall
V or U shape framing the head from above. This is the very start of a wing-flap, close to the body, not an
open display position.

EYE: the pupil is shaped like a keyhole (a small circle with a narrow triangular notch extending down from it),
clearly recognizable as a keyhole shape, not a plain round pupil.

BEAK AND KEY — must be clearly legible, not ambiguous: the beak is open, pointing forward and slightly down, with
a visible gap between upper and lower beak. An ornate skeleton-key shape hangs from the open beak, held crosswise
in it, drawn large and clear enough to be instantly recognizable as a key — not tucked away or overlapping other
shapes.

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
