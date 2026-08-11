// logo.js — Router per REDAKTIMIN e logos ekzistuese te bufit (OpenAI gpt-image-1, /edits).
// Ndryshe nga /generations (krijon nga zero), /edits merr NJE IMAZH REAL ekzistues dhe e
// ndryshon vetem sipas udhezimit — nuk gjeneron dizajn te ri cdo here.

const express = require('express');
const router = express.Router();

// ID-ja e skedarit nga linku i Google Drive: .../file/d/AKI_ESHTE_ID/view
const DRIVE_FILE_ID = '1qksA2BlfEjf0pxFiw10HCIhZ17KZNy2G';
const DRIVE_DIRECT_URL = `https://drive.google.com/uc?export=download&id=${DRIVE_FILE_ID}`;

router.get('/gjenero-logo-buf', async (req, res) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return res.status(500).send('OPENAI_API_KEY mungon.');

  // Udhezimi: VETEM krahet ndryshojne (pak me te hapur se tani, jo teresisht) — gjithcka
  // tjeter (koka anash, trupi drejt, syri, celesi, ngjyrat, stili) mbetet identike.
  const PROMPT = `Keep this exact owl logo completely unchanged — same head position turned to the side, same
straight-forward body, same keyhole-shaped eye, same key held crosswise in the open beak, same flat vector style,
same colors. Change ONLY the wings: open them a bit more than they currently are — a small, moderate increase in
how much they lift and spread outward — but do NOT open them fully. They should look partway between the current
mostly-folded position and a fully spread position: clearly more open than now, but still clearly not all the way
open. Do not change anything else about the image.`;

  try {
    // Hapi 1 — merr imazhin baze nga Google Drive
    const imgRes = await fetch(DRIVE_DIRECT_URL);
    if (!imgRes.ok) {
      return res.status(500).send(`<pre style="white-space:pre-wrap;background:#111;color:#f85149;padding:20px;">S'u mor imazhi baze nga Google Drive (status ${imgRes.status}). Ndoshta skedari s'është "Anyone with the link" i hapur publikisht.</pre>`);
    }
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get('content-type') || 'image/png';

    // Nese Drive ktheu faqe HTML (jo imazh real — ndodh nese skedari s'eshte publik ose eshte i madh)
    if (contentType.includes('text/html')) {
      return res.status(500).send(`<pre style="white-space:pre-wrap;background:#111;color:#f85149;padding:20px;">Google Drive ktheu faqe HTML, jo imazh — skedari duhet te jete i ndarë publikisht ("Anyone with the link can view"). Kontrollo cilësimet e ndarjes te skedari në Drive.</pre>`);
    }

    // Hapi 2 — dergo te /v1/images/edits si multipart/form-data
    const formData = new FormData();
    formData.append('image', new Blob([imgBuffer], { type: contentType }), 'baza.png');
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
