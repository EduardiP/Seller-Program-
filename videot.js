// videot.js — video funny me AI (Kling text-to-video + element reference permes fal.ai).
// AI shkruan skenen (kafshe funny qe vesh bluzE me dizajnin tend si @Element1).
const express = require('express');
const router = express.Router();
const { generateVideoConcept } = require('./ai');
const { pool } = require('./db');

const FAL_KEY = process.env.FAL_KEY;
const MODEL = 'fal-ai/kling-video/v3/standard/text-to-video';

const jobs = {};

// NIS: merr dizajnin (referencE), AI shkruan skenen, dergon te fal.
router.get('/video/start', async function (req, res) {
  try {
    if (!FAL_KEY) return res.status(500).json({ ok: false, error: 'Mungon FAL_KEY te Railway.' });

    // Dizajni-referencE nga databaza (ose ?image=URL)
    let designUrl = req.query.image;
    if (!designUrl) {
      const d = await pool.query(
        "SELECT image_url FROM designs WHERE image_url IS NOT NULL ORDER BY RANDOM() LIMIT 1"
      );
      if (d.rows.length === 0) return res.status(404).json({ ok: false, error: "S'ka dizajne te ruajtura." });
      designUrl = d.rows[0].image_url;
    }

    // AI-ja shkruan skenen (ose ?prompt= manual)
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
        elements: [{ frontal_image_url: designUrl }],
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
      dizajni: designUrl,
      prompt: prompt,
      check: '/video/check?id=' + data.request_id
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// KONTROLLO: a mbaroi videoja?
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
