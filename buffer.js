// buffer.js — postimi automatik ne rrjetet sociale permes Buffer (GraphQL API).
const express = require('express');
const router = express.Router();
const { generateVideoCaption, generatePinterestSeo } = require('./ai');
const { pool } = require('./db');
const { createMockupUrl } = require('./pinterest');
 
const BUFFER_KEY = process.env.BUFFER_KEY;
const BUFFER_API = 'https://api.buffer.com';
const ORG_ID = '6a46593a27d1500618d57c54';
 
// ID-te e kanaleve te lidhura te Buffer.
const CHANNELS = {
  tiktok: '6a468c035ab6d2f1069885d9',
  instagram: '6a465b255ab6d2f106976fad',
  pinterest: '6a4761665ab6d2f1069c66d8'
};
 
// Linku i dyqanit (destinacioni per pinet e Pinterest).
const SHOP_URL = 'https://impressarel.myshopify.com';
 
// Board-i i Pinterest ku shkojne pinet.
const PINTEREST_BOARD = '1100919140100496663';
 
// Ndihmes: dergon nje query/mutation GraphQL te Buffer.
async function bufferGraphQL(query, variables) {
  const res = await fetch(BUFFER_API, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + BUFFER_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: query, variables: variables || {} })
  });
  const data = await res.json();
  return data;
}
 
// INFO: tregon kanalet (me ID-te e tyre).
router.get('/buffer/info', async function (req, res) {
  try {
    if (!BUFFER_KEY) return res.status(500).json({ ok: false, error: 'Mungon BUFFER_KEY te Railway.' });
    const query =
      '{ channels(input: { organizationId: "6a46593a27d1500618d57c54" }) { id service name } }';
    const data = await bufferGraphQL(query);
    res.json({ ok: true, data: data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
 
// BOARDS: tregon board-et e nje kanali Pinterest (per boardServiceId).
router.get('/buffer/boards', async function (req, res) {
  try {
    if (!BUFFER_KEY) return res.status(500).json({ ok: false, error: 'Mungon BUFFER_KEY te Railway.' });
    const query =
      'query { channel(input: { id: "' + CHANNELS.pinterest + '" }) { metadata { ... on PinterestMetadata { boards { serviceId name } } } } }';
    const data = await bufferGraphQL(query);
    res.json({ ok: true, data: data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
 
// Ndihmes: poston nje MOCKUP te Pinterest me titull SEO (publikon menjehere).
async function postToPinterest(caption, animal, designUrlOverride) {
  // Mockup nga dizajni i fundit
  let mockupUrl = designUrlOverride;
  if (!mockupUrl) mockupUrl = await createMockupUrl(null);
 
  // Titull + pershkrim SEO me AI
  const seo = await generatePinterestSeo(caption || '', animal || '');
  const title = (seo.title || 'Funny t-shirt').slice(0, 100);
  const desc = (seo.description || '') + '\n\n' + (seo.hashtags || '');
 
  const mutation =
    'mutation ($text: String!, $channelId: ChannelId!, $url: String!, $title: String!, $link: String!, $board: String!) {' +
    '  createPost(input: {' +
    '    text: $text,' +
    '    channelId: $channelId,' +
    '    schedulingType: automatic,' +
    '    mode: shareNow,' +
    '    assets: [{ image: { url: $url } }],' +
    '    metadata: { pinterest: { title: $title, url: $link, boardServiceId: $board } }' +
    '  }) {' +
    '    ... on PostActionSuccess { post { id dueAt } }' +
    '    ... on MutationError { message }' +
    '  }' +
    '}';
  const data = await bufferGraphQL(mutation, {
    text: desc, channelId: CHANNELS.pinterest, url: mockupUrl, title: title, link: SHOP_URL, board: PINTEREST_BOARD
  });
  return { mockupUrl: mockupUrl, title: title, response: data };
}
 
// POST: video -> TikTok+Instagram, mockup -> Pinterest. Publikon menjehere.
// Perdorim: /buffer/post?video=URL&caption=TEKSTI&animal=KAFSHA
router.get('/buffer/post', async function (req, res) {
  try {
    if (!BUFFER_KEY) return res.status(500).json({ ok: false, error: 'Mungon BUFFER_KEY te Railway.' });
    const videoUrl = req.query.video;
    if (!videoUrl) return res.status(400).json({ ok: false, error: 'Mungon video URL.' });
 
    // Titulli/pershkrimi i videos me AI (SEO)
    let text = req.query.text;
    if (!text) {
      const cap = await generateVideoCaption(req.query.caption || '', req.query.animal || '');
      text = (cap.caption || '') + '\n\n' + (cap.hashtags || '');
    }
 
    const results = [];
 
    // 1) VIDEO -> TikTok + Instagram (publikon menjehere)
    const videoTargets = [
      { channelId: CHANNELS.tiktok, meta: '' },
      { channelId: CHANNELS.instagram, meta: ', metadata: { instagram: { type: reel, shouldShareToFeed: true } }' }
    ];
    for (var i = 0; i < videoTargets.length; i++) {
      const t = videoTargets[i];
      const mutation =
        'mutation ($text: String!, $channelId: ChannelId!, $url: String!) {' +
        '  createPost(input: {' +
        '    text: $text,' +
        '    channelId: $channelId,' +
        '    schedulingType: automatic,' +
        '    mode: shareNow,' +
        '    assets: [{ video: { url: $url } }]' +
        t.meta +
        '  }) {' +
        '    ... on PostActionSuccess { post { id dueAt } }' +
        '    ... on MutationError { message }' +
        '  }' +
        '}';
      const data = await bufferGraphQL(mutation, { text: text, channelId: t.channelId, url: videoUrl });
      results.push({ target: 'video', channelId: t.channelId, response: data });
    }
 
    // 2) MOCKUP -> Pinterest (titull SEO, publikon menjehere)
    try {
      const pin = await postToPinterest(req.query.caption || '', req.query.animal || '', null);
      results.push({ target: 'pinterest', mockupUrl: pin.mockupUrl, title: pin.title, response: pin.response });
    } catch (pe) {
      results.push({ target: 'pinterest', error: pe.message });
    }
 
    res.json({ ok: true, text: text, results: results });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
 
// POST VETEM PINTEREST: mockup + titull SEO -> Pinterest (pa tiktok/instagram).
// Perdorim: /buffer/pinterest?caption=TEKSTI&animal=KAFSHA
router.get('/buffer/pinterest', async function (req, res) {
  try {
    if (!BUFFER_KEY) return res.status(500).json({ ok: false, error: 'Mungon BUFFER_KEY te Railway.' });
 
    let caption = req.query.caption;
    let animal = req.query.animal;
    // Nese s'jane dhene, marrim dizajnin e fundit nga databaza per mesazhin.
    if (!caption) {
      const d = await pool.query(
        "SELECT caption, animal FROM designs WHERE image_url IS NOT NULL ORDER BY created_at DESC LIMIT 1"
      );
      if (d.rows.length > 0) { caption = d.rows[0].caption; animal = d.rows[0].animal; }
    }
 
    const pin = await postToPinterest(caption || '', animal || '', null);
    res.json({ ok: true, mockupUrl: pin.mockupUrl, title: pin.title, response: pin.response });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
 
module.exports = { router, bufferGraphQL, ORG_ID };
