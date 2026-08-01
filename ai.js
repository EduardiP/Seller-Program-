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
    'IMPORTANT FOCUS: the humor should feel like a fun personality badge — the kind of relatable joke where someone instantly thinks "haha that is literally me" and would happily WEAR it to show others what they are like (their vibe: introvert, lazy, sarcastic, always tired, socially awkward, avoids people, etc). ' +
    'Keep it light and genuinely funny (never deep, heavy, abstract, or random) — a playful everyday truth people recognize in themselves and want to show off. ' +
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

// AI #1b: shkruan nje thenie funny TE PAVARUR (per dizajne vetem-tekst, pa kafshe/mimike).
async function generateTextConcept() {
  const systemPrompt =
    'You are a world-class comedy writer for a viral typography t-shirt brand. ' +
    'Your job is to invent ONE original, genuinely funny TEXT-ONLY t-shirt slogan. ' +
    'There is NO image, NO animal, NO character — only the words. ' +
    'So the joke must stand completely on its own and must NOT refer to any facial expression, ' +
    'animal, picture, or visual. ' +
    'WHAT MAKES PEOPLE LAUGH: relatable everyday situations everyone secretly experiences ' +
    '(procrastination, being tired, overthinking, introvert life, work/Monday pain, ' +
    'pretending to be okay, avoiding people, weekend vs reality, being broke, anxiety humor, ' +
    'lazy habits, petty thoughts, sarcasm, self-deprecating humor). ' +
    'STRICT RULES: ' +
    '1) The slogan must be ORIGINAL, short, punchy, and ACTUALLY funny (not random). ' +
    '2) It must make sense as words alone on a shirt, like a clever quote or statement. ' +
    'IMPORTANT FOCUS: the slogan should feel like a fun personality badge — the kind of relatable, funny line where someone instantly thinks "haha that is literally me" and would happily WEAR it to show others their vibe (introvert, lazy, sarcastic, always tired, socially awkward, avoids people, etc). ' +
    'Keep it light and genuinely funny (never deep, heavy, abstract, or random) — a playful everyday truth people recognize in themselves and want to show off. ' +
    '3) Do NOT use existing meme phrases, song lyrics, movie quotes, brand slogans, or trademarked text. ' +
    '4) Keep it clean and broadly appropriate. ' +
    'Respond ONLY with valid JSON, no extra text, in this exact format: ' +
    '{"text": "the funny slogan", ' +
    '"albanian": "a faithful, natural Albanian translation of the slogan ONLY, no explanation"}';

  const themes = [
    'procrastination', 'being tired', 'social awkwardness', 'introvert life',
    'Monday and work', 'overthinking', 'being lazy', 'avoiding people',
    'pretending to be fine', 'weekend vs reality', 'being broke', 'sarcasm',
    'trust issues', 'anxiety', 'self-control', 'getting older', 'bad decisions',
    'staying in bed', 'ignoring responsibilities', 'small victories', 'coffee dependence',
    'adulting', 'self-deprecating humor'
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
        { role: 'user', content: 'Invent one genuinely funny text-only t-shirt slogan now, loosely inspired by the theme: "' + pick + '". It must work as words alone, no image.' }
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
  if (!content) throw new Error('Nuk u kthye koncept teksti nga AI.');

  let concept;
  try {
    const clean = content.replace(/```json/g, '').replace(/```/g, '').trim();
    concept = JSON.parse(clean);
  } catch (e) {
    throw new Error('Koncepti i tekstit s\'u parsua dot: ' + content);
  }
  return concept;
}

// AI: gjeneron nje skenE video funny (kafshe qe sillet si njeri) per Kling.
// AI: gjeneron skenen e videos bazuar te MESAZHI i dizajnit real (kafsha jeton memen).
async function generateVideoConcept(caption, animal) {
  caption = caption || 'funny relatable moment';
  var hasAnimal = animal && animal !== 'text-only';

  const systemPrompt =
    'You are a creative director for a viral funny-animal short video brand that sells t-shirts. ' +
    'You write prompts for an AI video model (Kling), 5 seconds long, vertical 9:16. ' +
    'You are given the funny message printed on a t-shirt, and you must create a scene where an animal ACTS OUT and EMBODIES that exact message with its behavior and facial expression. ' +
    'The comedy must come FROM the t-shirt message itself, not from a random unrelated action. ' +
    'STRICT RULES: ' +
    '1) ONE animal only, behaving like a human, PERFORMING the emotion/situation of the t-shirt message (its expression and actions must match the joke). ' +
    'NO other humans or animals appear. ' +
    '2) The video MUST START with the funniest, most attention-grabbing moment in the first second. ' +
    '3) From the VERY FIRST second and throughout the ENTIRE video, the animal is clearly wearing a plain t-shirt with @Element1 printed large and fully visible on the chest. The @Element1 print must stay clearly visible on the shirt at all times, from start to finish. Always refer to the printed graphic exactly as @Element1. ' +
    '4) The animal must behave in a CONTROLLED, natural way (no chaotic, no glitchy, no uncontrolled movements) — smooth realistic motion only. ' +
    '5) At the very END, the animal proudly shows off the @Element1 print on its chest, then points upward with one finger and clearly says the exact English phrase "link in bio" (keep these three English words untranslated). ' +
    '6) VISUAL STYLE (CRITICAL): 100% photorealistic live-action real footage, shot on a real camera, like a real pet video. ' +
    'The animal is a REAL living animal with real fur, real textures, real eyes, natural lighting. ' +
    'ABSOLUTELY NOT cartoon, NOT anime, NOT animated, NOT CGI, NOT 3D render, NOT Pixar, NOT illustration, NOT stylized. Real footage only. ' +
    'Begin the prompt itself with the words "Photorealistic live-action real footage of". ' +
    'For any spoken English words, use lowercase letters. ' +
    'Respond ONLY with valid JSON in this exact format: ' +
    '{"prompt": "the full vivid Kling video prompt, where the animal acts out the t-shirt message, starting with the funniest moment and ending with the animal saying link in bio", ' +
    '"albanian": "a short natural Albanian description of the scene for the owner"}';

  var userMsg;
  if (hasAnimal) {
    userMsg = 'The t-shirt message is: "' + caption + '". Use a ' + animal + ' that acts out and embodies this exact message with its expression and behavior. Start with the funniest moment, and end with the animal saying "link in bio".';
  } else {
    userMsg = 'The t-shirt message is: "' + caption + '". Choose the funniest animal that fits this message, and have it act out and embody this exact message with its expression and behavior. Start with the funniest moment, and end with the animal saying "link in bio".';
  }

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
        { role: 'user', content: userMsg }
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
  if (!content) throw new Error('Nuk u kthye koncept videoje nga AI.');

  let concept;
  try {
    const clean = content.replace(/```json/g, '').replace(/```/g, '').trim();
    concept = JSON.parse(clean);
  } catch (e) {
    throw new Error('Koncepti i videos s\'u parsua dot: ' + content);
  }
  return concept;
}
// AI: gjeneron titull + pershkrim + hashtag te optimizuar per SEO/audience per nje video.
async function generateVideoCaption(caption, animal) {
  caption = caption || 'funny relatable design';
  var hasAnimal = animal && animal !== 'text-only';
  var subject = hasAnimal ? ('a funny ' + animal) : 'a funny character';

  const systemPrompt =
    'You are an expert social media copywriter and SEO specialist for a funny apparel brand (t-shirts). ' +
    'You write short, scroll-stopping captions for short funny animal videos posted on TikTok, Instagram Reels and YouTube Shorts. ' +
    'Your goal: MAXIMIZE reach and reach the RIGHT audience (people who would buy funny relatable t-shirts). ' +
    'RULES: ' +
    '1) Write a punchy, natural caption (1-2 short lines) built around the t-shirt message, that makes the target buyer feel "this is me". ' +
    '2) The caption must feel human and fun, not corporate, not spammy. ' +
    '3) End with a short call to action to check the link in bio / shop. ' +
    '4) Provide 8-12 relevant, high-intent hashtags mixing broad + niche keywords (funny apparel, the specific theme, the animal, meme tees, gift ideas) for discovery and SEO. ' +
    'Avoid banned/spammy tags. No duplicate tags. ' +
    '5) Keep it clean and broadly appropriate. ' +
    'Respond ONLY with valid JSON in this exact format: ' +
    '{"title": "a short SEO-friendly title (max ~60 chars) with a key phrase", ' +
    '"caption": "the full caption text WITHOUT hashtags", ' +
    '"hashtags": "space-separated hashtags starting with #"}';

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
        { role: 'user', content: 'The video shows ' + subject + ' acting out this t-shirt message: "' + caption + '". Write the title, caption and hashtags, optimized for SEO and for reaching people who buy funny relatable t-shirts.' }
      ],
      temperature: 0.9
    })
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) {
    const err = new Error('OpenAI chat error ' + res.status);
    err.status = res.status; err.body = data; throw err;
  }
  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) throw new Error('Nuk u kthye titull nga AI.');
  let out;
  try {
    const clean = content.replace(/```json/g, '').replace(/```/g, '').trim();
    out = JSON.parse(clean);
  } catch (e) {
    throw new Error('Titulli s\'u parsua dot: ' + content);
  }
  return out;
}

// AI: gjeneron titull + pershkrim SEO per nje pin te Pinterest (mockup veshjeje).
async function generatePinterestSeo(caption, animal) {
  caption = caption || 'funny relatable design';
  var hasAnimal = animal && animal !== 'text-only';
  var subject = hasAnimal ? ('a funny ' + animal) : 'a funny slogan';

  const systemPrompt =
    'You are a Pinterest SEO expert for a funny apparel brand (t-shirts). ' +
    'Pinterest is a visual SEARCH engine: people search with keywords, and pins with keyword-rich, descriptive titles and descriptions rank and get discovered for months. ' +
    'Write a Pin TITLE and a Pin DESCRIPTION optimized to be FOUND by shoppers searching for funny/relatable t-shirts and gifts. ' +
    'TITLE RULES: keyword-rich and descriptive (Pinterest allows up to 100 characters, and longer descriptive titles with real search keywords usually perform BETTER than very short ones). ' +
    'Lead with the main keyword, include the product type (shirt/tee), the vibe/theme, who it is for, and gift angle when natural. Natural human language, not keyword stuffing. ' +
    'DESCRIPTION RULES: 2-3 short sentences with natural keywords (funny t-shirt, gift idea, the theme, the animal), ending with a soft call to action to shop. ' +
    'Also give 6-10 Pinterest hashtags (broad + niche). ' +
    'Respond ONLY with valid JSON in this exact format: ' +
    '{"title": "the SEO Pinterest title (up to ~100 chars)", ' +
    '"description": "the SEO Pinterest description", ' +
    '"hashtags": "space-separated hashtags starting with #"}';

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
        { role: 'user', content: 'The t-shirt shows ' + subject + ' with this message: "' + caption + '". Write the SEO-optimized Pinterest title, description and hashtags to reach shoppers searching for funny relatable t-shirts and gift ideas.' }
      ],
      temperature: 0.8
    })
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) {
    const err = new Error('OpenAI chat error ' + res.status);
    err.status = res.status; err.body = data; throw err;
  }
  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) throw new Error('Nuk u kthye titull Pinterest nga AI.');
  let out;
  try {
    const clean = content.replace(/```json/g, '').replace(/```/g, '').trim();
    out = JSON.parse(clean);
  } catch (e) {
    throw new Error('Titulli Pinterest s\'u parsua dot: ' + content);
  }
  return out;
}

module.exports = { router, generateImage, generateConcept, generateTextConcept, generateVideoConcept, generateVideoCaption, generatePinterestSeo };
