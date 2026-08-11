// logo.js — Router per gjenerimin e logos se bufit me AI (OpenAI gpt-image-1).
// I ndertuar sipas te njejtit model si auth.js/admin.js/etj — eksporton { router }.

const express = require('express');
const router = express.Router();

router.get('/gjenero-logo-buf', async (req, res) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return res.status(500).send('OPENAI_API_KEY mungon.');

  const PROMPT = `A FLAT VECTOR illustration logo of a single owl — bold clean vector shapes with fine linework used only
as accent detail (feather outlines, a few texture strokes), NOT dense all-over cross-hatching, NOT an engraved
photographic texture, NOT painterly shading. Think "detailed vector emblem," not "engraved etching." Composition
inspired by the formal, symmetrical gravitas of the Great Seal of the United States — detailed and emblematic,
but rendered as clean flat vector art, not a realistic engraving. Standalone brand logo mark on a plain solid
background.

Do NOT copy the Great Seal's actual content — no eagle, no shield, no arrows, no olive branch, no stars, no
banner text. Only borrow its formal, symmetrical, detailed-emblem AESTHETIC, applied to an original owl subject.

IMPORTANT — wing pose: take ONLY the feather shape and layered style from angel-wing references, but the ANGLE
must be different from a typical fully-spread angel wing. The wings must be raised at only a moderate angle,
roughly 30-45 degrees up from the body — clearly NOT fully spread wide open, NOT symmetrical full extension like
a classic spread-wing angel illustration. This should read as the very beginning of a wing-flap, mid-motion,
partially raised — not the wings' fully open peak position.

The owl's head is turned to the side, but only partially, showing mostly one eye rather than a full front-facing
face or a full profile.

The eye's pupil is not a plain circle — it is explicitly shaped like an old-fashioned ornate skeleton key silhouette
(the classic key outline: a round bow/handle at top connecting to a narrow shaft with small teeth at the bottom),
rendered in place of a normal round pupil, clearly recognizable as a key shape at a glance, not just a dark circle.

The owl's beak is open (not closed), and a second matching key-silhouette shape (same skeleton-key outline) sits
inside the open beak, as if held in it.

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
