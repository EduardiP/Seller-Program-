// compose.js — bashkon imazhin e kafshes (transparent) me tekstin e stilizuar.
const sharp = require('sharp');

function wrapText(text, maxCharsPerLine) {
  const words = (text || '').split(' ');
  const lines = [];
  let current = '';
  words.forEach(function (w) {
    if ((current + ' ' + w).trim().length <= maxCharsPerLine) {
      current = (current + ' ' + w).trim();
    } else {
      if (current) lines.push(current);
      current = w;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function buildTextSvg(text, width, height, options) {
  options = options || {};
  const fill = options.fill || '#1a1a1a';
  const stroke = options.stroke || '#ffffff';
  const fontSize = options.fontSize || 64;
  const lineHeight = fontSize * 1.15;

  const maxChars = Math.max(8, Math.floor(width / (fontSize * 0.55)));
  const lines = wrapText(text, maxChars);

  const totalTextHeight = lines.length * lineHeight;
  let startY = (height - totalTextHeight) / 2 + fontSize;

  let tspans = '';
  lines.forEach(function (line, i) {
    const y = startY + i * lineHeight;
    const safe = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    tspans += '<text x="' + (width / 2) + '" y="' + y + '" ' +
      'font-family="Arial Black, Arial, sans-serif" font-size="' + fontSize + '" font-weight="900" ' +
      'text-anchor="middle" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (fontSize * 0.06) + '" ' +
      'paint-order="stroke" stroke-linejoin="round">' + safe + '</text>';
  });

  return '<svg width="' + width + '" height="' + height + '" xmlns="http://www.w3.org/2000/svg">' +
    tspans + '</svg>';
}

async function composeDesign(animalB64, text, options) {
  options = options || {};
  const position = options.position || 'top';

  const CANVAS = 1024;
  const animalBuffer = Buffer.from(animalB64, 'base64');

  if (position === 'side') {
    const animalResized = await sharp(animalBuffer)
      .resize(Math.round(CANVAS * 0.55), CANVAS, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    const textSvg = buildTextSvg(text, Math.round(CANVAS * 0.42), CANVAS, { fontSize: 56 });
    const canvas = sharp({
      create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    });
    return canvas.composite([
      { input: animalResized, left: 0, top: 0 },
      { input: Buffer.from(textSvg), left: Math.round(CANVAS * 0.56), top: 0 }
    ]).png().toBuffer();
  }

  const animalResized = await sharp(animalBuffer)
    .resize(CANVAS, Math.round(CANVAS * 0.62), { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const textSvg = buildTextSvg(text, CANVAS, Math.round(CANVAS * 0.34), { fontSize: 70 });
  const canvas = sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  });
  return canvas.composite([
    { input: Buffer.from(textSvg), left: 0, top: 10 },
    { input: animalResized, top: Math.round(CANVAS * 0.36), left: 0, gravity: 'south' }
  ]).png().toBuffer();
}

module.exports = { composeDesign, buildTextSvg, wrapText };
