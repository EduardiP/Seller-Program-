// logo.js — Router i ri per gjenerimin e logos se bufit me AI (fal.ai / Recraft V3).
// I ndertuar sipas te njejtit model si auth.js/admin.js/etj — eksporton { router }.

const express = require('express');
const router = express.Router();

router.get('/gjenero-logo-buf', async (req, res) => {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) return res.status(500).send('FAL_KEY mungon.');

  const MODEL = 'fal-ai/recraft/v3/text-to-image';

  const PROMPT = `Minimalist vector logo icon of a single owl, standalone brand mark on a plain solid background.
Overall composition inspired by the formal, symmetrical, emblematic gravitas of heraldic seals (in the spirit of
the Great Seal of the United States) — but an entirely original owl design, NOT copying its structure, eagle,
shield, arrows, olive branch, stars, or any specific iconography from it. Style reference only, not content.

The owl's wings are captured at the very start of flight: partially raised and just beginning to open, NOT fully
spread wide and NOT folded down at rest — a clear in-between, early-motion position. Wing shapes and proportions
should read as a real owl's wings (broad, rounded feather shapes), not a literal eagle or angel wing copy — only
borrow the ANGLE/POSITION of opening from a bird-of-prey or angel-wing reference, not the exact feather design.

The owl's head is turned slightly to the side — a partial turn, NOT a full 90-degree profile — just enough that
one eye is clearly the visible, featured eye of the composition.

Inside that visible eye, a small ornate vintage key shape is incorporated as part of the eye's design (the key
reads as the pupil/iris detail). A second, matching key motif is incorporated into the owl's beak/mouth area.

Rendering style: flat, clean, bold vector illustration with simple confident shapes and minimal internal detail —
explicitly NOT photorealistic, NOT an engraved or textured seal, NOT a shaded or painterly illustration. Limited
flat color palette, crisp clean edges, high contrast, easily recognizable at small sizes (favicon-scale).
This is a standalone logo/brand icon only — NOT a t-shirt print, NOT a badge with a text ring, NOT a scene, NOT
a mockup on any product or surface.`;

  const NEGATIVE_PROMPT = 'photorealistic, engraved texture, shading gradient, t-shirt mockup, badge ring text, ' +
    'full spread wings, folded wings, eagle, shield, stars, olive branch, full profile head, side view 90 degrees, ' +
    'realistic feathers, photo, 3d render, complex background, multiple objects, watermark, text, letters';

  try {
    const submitRes = await fetch(`https://queue.fal.run/${MODEL}`, {
      method: 'POST',
      headers: { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: PROMPT, negative_prompt: NEGATIVE_PROMPT, style: 'vector_illustration', image_size: 'square_hd' })
    });
    if (!submitRes.ok) throw new Error('Dërgimi dështoi: ' + await submitRes.text());
    const submitData = await submitRes.json();
    const statusUrl = submitData.status_url || `https://queue.fal.run/${MODEL}/requests/${submitData.request_id}/status`;
    const resultUrl = submitData.response_url || `https://queue.fal.run/${MODEL}/requests/${submitData.request_id}`;

    let gati = false;
    for (let i = 0; i < 30 && !gati; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const statRes = await fetch(statusUrl, { headers: { 'Authorization': `Key ${FAL_KEY}` } });
      const stat = await statRes.json();
      if (stat.status === 'COMPLETED') gati = true;
      else if (stat.status === 'FAILED' || stat.status === 'ERROR') throw new Error('Gjenerimi dështoi.');
    }
    if (!gati) throw new Error('Kaloi koha e pritjes.');

    const finalRes = await fetch(resultUrl, { headers: { 'Authorization': `Key ${FAL_KEY}` } });
    const finalData = await finalRes.json();
    const imazhi = finalData.images && finalData.images[0];
    if (!imazhi || !imazhi.url) throw new Error('S\'u kthye imazh.');

    res.send(`<body style="background:#111;text-align:center;padding:40px;font-family:sans-serif;">
      <img src="${imazhi.url}" style="max-width:500px;border-radius:12px;">
      <p style="color:#aaa;margin-top:20px;">
        <a href="${imazhi.url}" style="color:#4a9eff;">${imazhi.url}</a>
      </p>
    </body>`);
  } catch (e) {
    res.status(500).send('Gabim: ' + e.message);
  }
});

module.exports = { router };
