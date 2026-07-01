// videot.js — gjenerimi i videove funny me AI (Kling permes fal.ai).
// I ndare nga skedaret e tjere. Lidhet me server.js me nje rresht.
const express = require('express');
const router = express.Router();
const { pool } = require('./db');

const FAL_KEY = process.env.FAL_KEY;
const MODEL = 'fal-ai/kling-video/o3/standard/image-to-video';

// Ruajme URL-t qe kthen fal per çdo kerkese (ne memorie, per test).
const jobs = {};

const DEFAULT_PROMPT =
  'Create a funny, expressive monkey wearing a plain short-sleeved cotton t-shirt. ' +
  'The provided graphic is the design printed on the front of the t-shirt, centered on the chest. ' +
  'The monkey playfully applies a little makeup while looking into a small handheld mirror, ' +
  'with exaggerated comedic facial expressions. Then it lowers the mirror, leans back slightly, ' +
  'smiles warmly at the camera, and points upward with one finger while saying "link in bio". ' +
  'The printed design stays clearly visible on the shirt. ' +
  'Smooth natural motion, humorous comedic timing, well lit, vertical video.';

// NIS: dergon kerkesen te fal. Imazhi = nje DIZAJN nga databaza (ose ?image=URL).
router.get('/video/start', async function (req, res) {
  try {
    if (!FAL_KEY) return res.status(500).json({ ok: false, error: 'Mungon FAL_KEY te Railway.' });

    let image = req.query.image;
    if (!image) {
      // marrim nje dizajn te rastesishem nga tabela designs
      const d = await pool.query(
        "SELECT image_url FROM designs WHERE image_url IS NOT NULL ORDER BY RANDOM() LIMIT 1"
      );
      if (d.rows.length === 0) return res.status(404).json({ ok: false, error: "S'ka dizajne te ruajtura." });
      image = d.rows[0].image_url;
    }
    const prompt = req.query.prompt || DEFAULT_PROMPT;

    const r = await fetch('https://queue.fal.run/' + MODEL, {
      method: 'POST',
      headers: { 'Authorization': 'Key ' + FAL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: image,
        prompt: prompt,
        duration: '5',
        generate_audio: true
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ ok: false, error: data });
    jobs[data.request_id] = { status_url: data.status_url, response_url: data.response_url };
    res.json({ ok: true, request_id: data.request_id, check: '/video/check?id=' + data.request_id });
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
