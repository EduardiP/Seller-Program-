// ai.js — gjenerimi i imazheve me OpenAI (gpt-image)
// Hapi 1: nje test i thjeshte qe gjeneron nje kafshe funny.

const express = require('express');
const { requireShopifyProxy } = require('./auth');

const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_IMAGE_URL = 'https://api.openai.com/v1/images/generations';

// Ndihmes: gjeneron nje imazh me OpenAI dhe kthen base64-in.
async function generateImage(prompt, options) {
  options = options || {};
  const body = {
    model: options.model || 'gpt-image-1',
    prompt: prompt,
    n: 1,
    size: options.size || '1024x1024'
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

// TEST: gjeneron nje kafshe funny dhe e kthen si imazh per ta pare ne browser.
router.get('/ai/test-image', requireShopifyProxy, async function (req, res) {
  try {
    const prompt = 'A funny cartoon cat with an exaggerated shocked expression, ' +
      'big eyes, vintage style, bold colors, solid white background, sticker style, high quality';
    const b64 = await generateImage(prompt);
    const buffer = Buffer.from(b64, 'base64');
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, detail: e.body || null });
  }
});

module.exports = { router, generateImage };
