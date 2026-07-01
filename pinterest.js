// pinterest.js — krijimi i mockup-eve (dhe me vone postimi ne Pinterest).
// I ndare nga skedaret e tjere. Lidhet me server.js me nje rresht.
const express = require('express');
const sharp = require('sharp');
const { pool } = require('./db');

const router = express.Router();

// Krijon tabelen e veshjeve dhe i mbush NJE here me dy veshjet (automatik).
async function initPinterest() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mockup_garments (
      id SERIAL PRIMARY KEY,
      image_url TEXT NOT NULL,
      cx REAL DEFAULT 0.5,
      cy REAL DEFAULT 0.47,
      wfrac REAL DEFAULT 0.37,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  const count = await pool.query('SELECT COUNT(*) AS n FROM mockup_garments');
  if (parseInt(count.rows[0].n, 10) === 0) {
    await pool.query(
      `INSERT INTO mockup_garments (image_url, cx, cy, wfrac)
       VALUES ($1,$2,$3,$4),($5,$6,$7,$8)`,
      [
        'https://res.cloudinary.com/dlgzjfh4g/image/upload/v1782930489/19ec783f718_1_hgvoab.jpg', 0.5, 0.47, 0.38,
        'https://res.cloudinary.com/dlgzjfh4g/image/upload/v1782930490/699b5dfa3e56706b810abff1_bwlefc.png', 0.5, 0.46, 0.36
      ]
    );
    console.log('mockup_garments u mbush me 2 veshje.');
  }
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("S'u shkarkua imazhi: " + url);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

// Krijon nje mockup: dizajni (transparent) mbi nje veshje te rastesishme.
async function generateMockup(designUrl) {
  const g = await pool.query('SELECT * FROM mockup_garments ORDER BY RANDOM() LIMIT 1');
  if (g.rows.length === 0) throw new Error("S'ka veshje te mockup_garments.");
  const garment = g.rows[0];

  const garmentBuf = await fetchBuffer(garment.image_url);
  const designBuf = await fetchBuffer(designUrl);

  const gMeta = await sharp(garmentBuf).metadata();
  const GW = gMeta.width;
  const GH = gMeta.height;

  const targetW = Math.round(GW * garment.wfrac);
  const angle = (Math.random() * 6) - 3; // rrotullim i lehte: -3 deri +3 grade

  const designResized = await sharp(designBuf)
    .resize({ width: targetW })
    .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const dMeta = await sharp(designResized).metadata();
  const left = Math.round(GW * garment.cx - dMeta.width / 2);
  const top = Math.round(GH * garment.cy - dMeta.height / 2);

  const mockup = await sharp(garmentBuf)
    .composite([{ input: designResized, left: left, top: top }])
    .jpeg({ quality: 90 })
    .toBuffer();

  return mockup;
}

// TEST: merr nje dizajn nga tabela designs dhe e shfaq mockup-in direkt ne shfletues.
router.get('/pinterest/test-mockup', async function (req, res) {
  try {
    await initPinterest();
    const d = await pool.query(
      "SELECT image_url FROM designs WHERE image_url IS NOT NULL ORDER BY RANDOM() LIMIT 1"
    );
    if (d.rows.length === 0) return res.status(404).send("S'ka dizajne te ruajtura.");
    const mockup = await generateMockup(d.rows[0].image_url);
    res.set('Content-Type', 'image/jpeg');
    res.send(mockup);
  } catch (e) {
    res.status(500).send('Gabim: ' + e.message);
  }
});

module.exports = { router, initPinterest, generateMockup };
