// gjenero-logo-buf.js — Gjeneron logon e bufit me AI (fal.ai / Recraft V3, stil vektorial).
// Perdor FAL_KEY qe e ke tashme te konfiguruar ne kete projekt (Railway).
//
// Perdorimi:  node gjenero-logo-buf.js
// Rezultati:  ruan imazhin lokalisht si logo-buf.png (ose ekstensioni real qe kthen API-ja)
//
// Cmimi: Recraft V3, stil "vector_illustration" ~$0.08/imazh (raster ~$0.04) — jo modeli
// me i shtrenjte i disponueshem (p.sh. Nano Banana Pro ~$0.15), po nder me te miret per logo/vektor.

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error('FAL_KEY mungon nga variablat e mjedisit.');
  process.exit(1);
}

const MODEL = 'fal-ai/recraft/v3/text-to-image';

// Përshkrimi — e qëllimshme, e detajuar: çdo kërkesë konkrete e përfshirë veç e veç,
// dhe theksuar shprehimisht qëllimi (LOGO e vetme, jo print bluze/skenë/ilustrim i plotë).
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

async function gjeneroLogon() {
  console.log('Duke dërguar kërkesën te Recraft V3 (fal.ai)...');

  // Hapi 1 — dergo kerkesen ne rradhe (queue)
  const submitRes = await fetch(`https://queue.fal.run/${MODEL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: PROMPT,
      negative_prompt: NEGATIVE_PROMPT,
      style: 'vector_illustration',
      image_size: 'square_hd'
    })
  });
  if (!submitRes.ok) {
    throw new Error(`Dërgimi dështoi (${submitRes.status}): ${await submitRes.text()}`);
  }
  const submitData = await submitRes.json();
  const requestId = submitData.request_id;
  const statusUrl = submitData.status_url || `https://queue.fal.run/${MODEL}/requests/${requestId}/status`;
  const resultUrl = submitData.response_url || `https://queue.fal.run/${MODEL}/requests/${requestId}`;

  // Hapi 2 — prit derisa te perfundoje (poll cdo 2 sekonda, max ~60 sekonda)
  console.log('Duke pritur gjenerimin...');
  let gati = false;
  for (let i = 0; i < 30 && !gati; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const statRes = await fetch(statusUrl, { headers: { 'Authorization': `Key ${FAL_KEY}` } });
    const stat = await statRes.json();
    if (stat.status === 'COMPLETED') gati = true;
    else if (stat.status === 'FAILED' || stat.status === 'ERROR') {
      throw new Error('Gjenerimi dështoi: ' + JSON.stringify(stat));
    }
  }
  if (!gati) throw new Error('Kaloi koha e pritjes (60s) pa përfunduar.');

  // Hapi 3 — merr rezultatin (URL e imazhit)
  const finalRes = await fetch(resultUrl, { headers: { 'Authorization': `Key ${FAL_KEY}` } });
  const finalData = await finalRes.json();
  const imazhi = finalData.images && finalData.images[0];
  if (!imazhi || !imazhi.url) throw new Error('S\'u kthye asnjë imazh: ' + JSON.stringify(finalData));

  console.log('Gati! URL e imazhit:', imazhi.url);

  // Hapi 4 — shkarko dhe ruaj lokalisht
  const imgRes = await fetch(imazhi.url);
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const ext = (imazhi.content_type || '').includes('png') ? 'png'
    : (imazhi.content_type || '').includes('svg') ? 'svg' : 'png';
  const emriSkedari = `logo-buf.${ext}`;
  require('fs').writeFileSync(emriSkedari, buffer);
  console.log('U ruajt si:', emriSkedari);

  return imazhi.url;
}

gjeneroLogon().catch(e => {
  console.error('Gabim:', e.message);
  process.exit(1);
});
