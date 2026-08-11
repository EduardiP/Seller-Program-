// logo.js — Router per gjenerimin e logos se bufit me AI (OpenAI gpt-image-1).
// I ndertuar sipas te njejtit model si auth.js/admin.js/etj — eksporton { router }.

const express = require('express');
const router = express.Router();

router.get('/gjenero-logo-buf', async (req, res) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return res.status(500).send('OPENAI_API_KEY mungon.');

  const PROMPT = `A clean flat VECTOR illustration logo of a single owl, in the spirit of the Great Seal of the
United States but rendered as simple, confident vector shapes — bold flat color areas, clean crisp outlines,
minimal simple linework for feather texture (a few clean strokes, not dense detailed rendering). Explicitly
NOT a realistic painting, NOT a detailed engraving, NOT photographic shading or gradients — think modern flat
vector logo/icon design, clean and graphic, closer to a simple icon than to a detailed illustration. Standalone
brand logo mark on a plain solid background. No text, no banner, no shield, no eagle — an original owl design
only, borrowing only the Great Seal's formal symmetrical composition, not its realistic engraved rendering style.

BODY ORIENTATION — critical, re-check this before finalizing: the owl's chest, shoulders, and torso face straight
forward toward the viewer, perfectly symmetrical left-to-right, upright, NOT rotated or angled to either side.
Imagine a vertical line straight down the center of the chest — both shoulders and both wings must be mirror
images of each other across that line. Only the head breaks this symmetry by turning to the side, partially,
showing mostly one eye rather than a full front-facing face or a full side profile.

WING POSITION: the wings are mostly folded against the body, with only the very tips barely lifting outward, like
the first small twitch before takeoff — NOT a flap, NOT a display, NOT an open V or U shape. Wingtips stay well
below the top of the head and close to the body silhouette.

EYE: the pupil is shaped like a keyhole (a small circle with a narrow triangular notch extending down from it),
clearly recognizable as a keyhole shape, not a plain round pupil.

BEAK AND KEY: the beak is open, with a visible gap between upper and lower beak. An ornate key is held crosswise
in the beak, gripped through the MIDDLE of its shaft (like a dog holding a stick crosswise) — NOT held by one end,
NOT dangling from the tip or the bow/handle. Both the bow (handle) end and the toothed end of the key should be
visible sticking out on either side of the beak.

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
