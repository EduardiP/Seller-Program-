// ai.js — gjenerimi me OpenAI (tekst + imazh)

const express = require('express');
const { requireShopifyProxy } = require('./auth');

const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_IMAGE_URL = 'https://api.openai.com/v1/images/generations';
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

// Stili yt i fshehur — shtohet te cdo prompt imazhi.
// Me realiste (jo cartoon), vintage, dhe PA kontur/buze ne skaje.
const STYLE_SUFFIX =
  ', funny expressive character with an exaggerated comedic facial expression, ' +
  'vintage retro illustration style, slightly aged muted color palette, ' +
  'a bit more detailed and painterly than flat cartoon but still playful and humorous, ' +
  'clean cutout with NO white outline, NO border, NO halo, NO stroke around the edges, ' +
  'subject blends cleanly into the transparent background, ' +
  'transparent background, isolated subject, no background, high quality';
// AI #1 (regjisori): vendos vete tekstin funny, kafshen dhe mimiken.
async function generateConcept() {
  const systemPrompt =
    'You are a world-class comedy writer for a viral meme apparel brand. ' +
    'Your job is to invent ONE original, genuinely funny meme concept featuring an animal. ' +
    'WHAT MAKES PEOPLE LAUGH: relatable everyday situations everyone secretly experiences ' +
    '(awkward social moments, procrastination, being tired, overthinking, introvert struggles, ' +
    'work/Monday pain, pretending to be okay, avoiding people, weekend vs reality, ' +
    'trust issues, being broke, anxiety humor, lazy habits, petty thoughts). ' +
    'The animal\'s expression should comically mirror the emotion of the joke. ' +
    'EXPLORE WIDELY across many themes. Do NOT default to food jokes. ' +
    'STRICT RULES: ' +
    '1) The caption must be ORIGINAL, short, punchy, and ACTUALLY funny (not random, not nonsense). ' +
    '2) It must have a clear, relatable point that makes people go "haha so true". ' +
    '3) Do NOT use existing meme phrases, song lyrics, movie quotes, brand slogans, or trademarked text. ' +
    '4) Keep it clean and broadly appropriate. ' +
    '5) Avoid food-related jokes unless truly exceptional. ' +
    'Respond ONLY with valid JSON, no extra text, in this exact format: ' +
    '{"text": "the funny caption", "animal": "the animal", "expression": "the facial expression", ' +
    '"textPosition": "top or side (choose what fits best, usually top)", ' +
    '"albanian": "a faithful, natural Albanian translation of the caption ONLY, no explanation, no commentary, just the translated caption", ' +
    '"imagePrompt": "a detailed prompt to generate the animal in vintage funny style"}';
  // Nje shtyse e rastesishme per te shmangur perseritjen e temave.
  const themes = [
    'procrastination', 'being tired', 'social awkwardness', 'introvert life',
    'Monday and work', 'overthinking', 'being lazy', 'avoiding people',
    'pretending to be fine', 'weekend vs reality', 'being broke', 'petty revenge',
    'trust issues', 'anxiety', 'self-control', 'getting older', 'bad decisions',
    'staying in bed', 'ignoring responsibilities', 'small victories'
  ];
  const pick = themes[Math.floor(Math.random() * themes.length)];

  const res = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + OPENAI_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Invent one genuinely funny animal meme concept now, loosely inspired by the theme: "' + pick + '". Make it relatable and actually funny, not random.' }
      ],
      temperature: 1.1
    })
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }

  if (!res.ok) {
    const err = new Error('OpenAI chat error ' + res.status);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) throw new Error('Nuk u kthye koncept nga AI.');

  let concept;
  try {
    const clean = content.replace(/```json/g, '').replace(/```/g, '').trim();
    concept = JSON.parse(clean);
  } catch (e) {
    throw new Error('Koncepti s\'u parsua dot: ' + content);
  }
  return concept;
}

// Ndihmes: gjeneron nje imazh me OpenAI dhe kthen base64-in.
async function generateImage(prompt, options) {
  options = options || {};
  const body = {
    model: options.model || 'gpt-image-1',
    prompt: prompt,
    n: 1,
    size: options.size || '1024x1024',
    background: 'transparent',
    output_format: 'png'
  };

  const res = await fetch(OPENAI_IMAGE_URL, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + OPENAI_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }

  if (!res.ok) {
    const err = new Error('OpenAI error ' + res.status);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  const b64 = data && data.data && data.data[0] && data.data[0].b64_json;
  if (!b64) {
    throw new Error('Nuk u kthye imazh nga OpenAI.');
  }
  return b64;
}

// TEST: tregon konceptin (tekst + kafshe + mimike) qe prodhon AI #1.
router.get('/ai/test-concept', requireShopifyProxy, async function (req, res) {
  try {
    const concept = await generateConcept();
    res.json({ ok: true, concept: concept });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, detail: e.body || null });
  }
});

// TEST: gjeneron nje kafshe funny dhe e kthen si imazh.
router.get('/ai/test-image', requireShopifyProxy, async function (req, res) {
  try {
    const prompt = 'A funny squirrel with an exaggerated shocked expression, big eyes' + STYLE_SUFFIX;
    const b64 = await generateImage(prompt);
    const buffer = Buffer.from(b64, 'base64');
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, detail: e.body || null });
  }
});

// TEST: lidh AI #1 + AI #2 — shpik konceptin, pastaj gjeneron imazhin e tij (pa tekst).
router.get('/ai/test-full', requireShopifyProxy, async function (req, res) {
  try {
    const concept = await generateConcept();
    const fullPrompt = concept.imagePrompt + STYLE_SUFFIX;
    const b64 = await generateImage(fullPrompt);
    const buffer = Buffer.from(b64, 'base64');
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, detail: e.body || null });
  }
});

// TEST: rrjedha e plote — koncept + kafshe + tekst i stilizuar = dizajn final.
router.get('/ai/test-design', requireShopifyProxy, async function (req, res) {
  try {
    const { composeDesign } = require('./compose');
    const concept = await generateConcept();
    const fullPrompt = concept.imagePrompt + STYLE_SUFFIX;
    const animalB64 = await generateImage(fullPrompt);
    const position = (concept.textPosition === 'side') ? 'side' : 'top';
    const finalBuffer = await composeDesign(animalB64, concept.text, { position: position });
    res.set('Content-Type', 'image/png');
    res.send(finalBuffer);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, detail: e.body || null });
  }
});

// TEST: Mundesia 1 — AI gjeneron TERE dizajnin (kafshe + tekst + stil), si nje poster t-shirt.
router.get('/ai/test-design-ai', requireShopifyProxy, async function (req, res) {
  try {
    const concept = await generateConcept();
    const designPrompt =
      'A vintage retro t-shirt graphic design on a fully transparent background. ' +
      'Featuring ' + concept.animal + ' with a ' + concept.expression + ' expression, ' +
      'drawn in a distressed vintage halftone screen-print style (black ink with a warm burnt-orange and cream accent color). ' +
      'Behind the animal there is a retro sunset circle with mountains and pine trees silhouette. ' +
      'The funny caption text reads exactly: "' + concept.text + '". ' +
      'The text is large, bold, hand-lettered, in a mix of grunge brush and condensed vintage fonts, ' +
      'split across multiple lines, alternating between black and burnt-orange colors, ' +
      'arranged artistically around the animal so text and animal share the space without overlapping. ' +
      'Highly polished professional t-shirt print design, distressed vintage texture, ' +
      'transparent background, no photo background, sticker-ready, high quality.';
    const b64 = await generateImage(designPrompt);
    const buffer = Buffer.from(b64, 'base64');
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, detail: e.body || null });
  }
});

module.exports = { router, generateImage, generateConcept };
