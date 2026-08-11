// logo.js — Router per gjenerimin e logos se bufit me AI (OpenAI gpt-image-1).
// I ndertuar sipas te njejtit model si auth.js/admin.js/etj — eksporton { router }.

const express = require('express');
const router = express.Router();

router.get('/gjenero-logo-buf', async (req, res) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return res.status(500).send('OPENAI_API_KEY mungon.');

  const PROMPT = `Minimalist vector-style logo icon of a single owl, standalone brand mark on a plain solid background.
Overall composition inspired by the formal, symmetrical, emblematic gravitas of heraldic seals (in the spirit of
the Great Seal of the United States) — but an entirely original owl design. Do NOT copy its structure, eagle,
shield, arrows, olive branch, stars, or any specific iconography from it. Style reference only, not content.

The owl's wings are captured at the very start of flight: partially raised and just beginning to open. Do NOT
show them fully spread wide, and do NOT show them folded down at rest — a clear in-between, early-motion position.
Wing shapes and proportions should read as a real owl's wings (broad, rounded feather shapes), not a literal eagle
or angel wing copy — only borrow the ANGLE/POSITION of opening from a bird-of-prey or angel-wing reference.

The owl's head is turned slightly to the side — a partial turn, NOT a full 90-degree profile — just enough that
one eye is clearly the visible, featured eye of the composition.

Inside that visible eye, a small ornate vintage key shape is incorporated as part of the eye's design (the key
reads as the pupil/iris detail). The owl's beak is OPEN (not closed), and a second, matching key shape is placed
inside the open beak, as if held or visible through it.

Rendering style: flat, clean, bold vector illustration with simple confident shapes and minimal internal detail.
Do NOT make it photorealistic, do NOT make it an engraved or textured seal, do NOT make it shaded or painterly.
Limited flat color palette, crisp clean edges, high contrast, easily recognizable at small sizes (favicon-scale).

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
        quality: 'high'
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
