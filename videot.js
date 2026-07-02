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
    let videoUrl = null;
    if (result) {
      if (result.video && result.video.url) videoUrl = result.video.url;
      else if (result.data && result.data.video && result.data.video.url) videoUrl = result.data.video.url;
      else if (result.videos && result.videos[0] && result.videos[0].url) videoUrl = result.videos[0].url;
      else if (result.output && result.output.video && result.output.video.url) videoUrl = result.output.video.url;
    }
    res.json({ ok: true, status: 'COMPLETED', videoUrl: videoUrl, plot: result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
 
// FAQE: nje buton, nis videon, pret vete, shfaq videon kur mbaron.
router.get('/video', function (req, res) {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Krijo Video</title></head>' +
    '<body style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f7f7f8;color:#111;text-align:center;">' +
    '<h1>Krijo nje video funny</h1>' +
    '<p id="status" style="color:#666;min-height:24px;"></p>' +
    '<button id="go" style="padding:12px 24px;background:#111;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:16px;">Krijo video</button>' +
    '<div id="scene" style="margin-top:16px;font-size:13px;color:#444;"></div>' +
    '<div id="out" style="margin-top:20px;"></div>' +
    '<script>' +
    'var go=document.getElementById("go");' +
    'var statusEl=document.getElementById("status");' +
    'var scene=document.getElementById("scene");' +
    'var out=document.getElementById("out");' +
    'go.addEventListener("click",function(){' +
    '  go.disabled=true; out.innerHTML=""; scene.textContent="";' +
    '  statusEl.textContent="Po nis videon...";' +
    '  fetch("/video/start").then(function(r){return r.json();}).then(function(res){' +
    '    if(!res.ok){statusEl.textContent="Gabim: "+(res.error&&res.error.message||JSON.stringify(res.error));go.disabled=false;return;}' +
    '    if(res.skena){scene.textContent="Skena: "+res.skena;}' +
    '    statusEl.textContent="Po gjenerohet videoja... (mund te zgjase 1-3 minuta)";' +
    '    poll(res.request_id);' +
    '  }).catch(function(){statusEl.textContent="Nuk u lidh dot.";go.disabled=false;});' +
    '});' +
    'function poll(id){' +
    '  fetch("/video/check?id="+id).then(function(r){return r.json();}).then(function(res){' +
    '    if(res.status==="COMPLETED"){' +
    '      if(res.videoUrl){' +
    '        statusEl.textContent="Gati!";' +
    '        out.innerHTML=\'<video src="\'+res.videoUrl+\'" controls autoplay loop style="width:100%;border-radius:12px;"></video>\'+\'<br><a href="\'+res.videoUrl+\'" target="_blank" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#1a7f37;color:#fff;border-radius:8px;text-decoration:none;">Hap / Shkarko videon</a>\';' +
    '      } else { statusEl.textContent="Perfundoi por su gjet URL."; }' +
    '      go.disabled=false; return;' +
    '    }' +
    '    statusEl.textContent="Po gjenerohet... ("+(res.status||"po pret")+")";' +
    '    setTimeout(function(){poll(id);},6000);' +
    '  }).catch(function(){setTimeout(function(){poll(id);},6000);});' +
    '}' +
    '</script></body></html>'
  );
});
 
module.exports = { router };
