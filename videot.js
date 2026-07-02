// videot.js — gjenerimi i videove funny me AI (Kling text-to-video permes fal.ai).
// AI-ja shkruan vete skenen (kafshe funny), video fillon me kulmin, jo me dizajnin.
const express = require('express');
const router = express.Router();
const { generateVideoConcept } = require('./ai');

const FAL_KEY = process.env.FAL_KEY;
const MODEL = 'fal-ai/kling-video/v3/standard/text-to-video';

// Ruajme te dhenat qe kthen fal per çdo kerkese (ne memorie, per test).
const jobs = {};

// NIS: AI-ja shkruan skenen, pastaj e dergon te fal (text-to-video).
router.get('/video/start', async function (req, res) {
  try {
    if (!FAL_KEY) return res.status(500).json({ ok: false, error: 'Mungon FAL_KEY te Railway.' });

    // AI-ja gjeneron skenen funny (ose prompt i dhene manualisht me ?prompt=)
    let prompt = req.query.prompt;
    let albanian = null;
    if (!prompt) {
      const concept = await generateVideoConcept();
      prompt = concept.prompt;
      albanian = concept.albanian;
    }

    const r = await fetch('https://queue.fal.run/' + MODEL, {
      method: 'POST',
      headers: { 'Authorization': 'Key ' + FAL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt,
        duration: '5',
        aspect_ratio: '9:16',
        generate_audio: true
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ ok: false, error: data });
    jobs[data.request_id] = { status_url: data.status_url, response_url: data.response_url };
    res.json({
      ok: true,
      request_id: data.request_id,
      skena: albanian,
      prompt: prompt,
      check: '/video/check?id=' + data.request_id
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// KONTROLLO: a mbaroi videoja? Kur mbaron, kthen URL-ne e videos.
router.get('/video/check', async function (req, res) {
  try {
    const id = req.query.id;
    const job = jobs[id];
    if (!job) return res.status(404).json({ ok: false, error: 'ID e panjohur. Nis prap /video/start' });
    const sr = await fetch(job.status_url, { headers: { 'Authorization': 'Key ' + FAL_KEY } });
    const status = await sr.json();
    if (status.status !== 'COMPLETED') {
      return res.json({ ok: true, status: status.status, note: 'Ende po punon, provo prap pas pak.' });
    }
    const rr = await fetch(job.response_url, { headers: { 'Authorization': 'Key ' + FAL_KEY } });
    const result = await rr.json();
    const videoUrl = result && result.video && result.video.url;
    res.json({ ok: true, status: 'COMPLETED', videoUrl: videoUrl });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = { router };
