// ai.js — gjenerimi me OpenAI (tekst + imazh)

const express = require('express');
const { requireShopifyProxy } = require('./auth');

const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_IMAGE_URL = 'https://api.openai.com/v1/images/generations';
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

// AI #1 (regjisori): vendos vete tekstin funny, kafshen dhe mimiken.
async function generateConcept() {
  const systemPrompt =
    'You are a creative director for a funny meme apparel brand. ' +
    'Your job is to invent ONE original, funny meme concept featuring an animal. ' +
    'Rules: ' +
    '1) The text must be ORIGINAL (you write it yourself), short, genuinely funny, and relatable. ' +
    '2) Do NOT use any existing meme phrases, song lyrics, movie quotes, brand slogans, or trademarked text. ' +
    '3) Choose an animal and a facial expression that MATCHES the joke. ' +
    '4) Keep it clean and broadly appropriate. ' +
    'Respond ONLY with valid JSON, no extra text, in this exact format: ' +
    '{"text": "the funny caption", "animal": "the animal", "expression": "the facial expression", ' +
    '"imagePrompt": "a detailed prompt to generate the animal in vintage funny style"}';

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
        { role: 'user', content: 'Invent one funny animal meme concept now. Make it as funny as possible.' }
      ],
      temperature: 1.0
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
    const prompt = 'A funny cartoon cat with an exaggerated shocked expression, ' +
      'big eyes, vintage style, bold colors, transparent background, sticker style, high quality, ' +
      'isolated subject, no background';
    const b64 = await generateImage(prompt);
    const buffer = Buffer.from(b64, 'base64');
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, detail: e.body || null });
  }
});

module.exports = { router, generateImage, generateConcept };
