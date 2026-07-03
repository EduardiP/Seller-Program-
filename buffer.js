// buffer.js — postimi automatik ne rrjetet sociale permes Buffer (GraphQL API).
const express = require('express');
const router = express.Router();
const { generateVideoCaption } = require('./ai');
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
 
// POST: video -> TikTok+Instagram, dizajni -> Pinterest. Titull+hashtag me AI.
// Perdorim: /buffer/post?video=URL&design=URL&caption=TEKSTI&animal=KAFSHA
router.get('/buffer/post', async function (req, res) {
  try {
    if (!BUFFER_KEY) return res.status(500).json({ ok: false, error: 'Mungon BUFFER_KEY te Railway.' });
    const videoUrl = req.query.video;
    if (!videoUrl) return res.status(400).json({ ok: false, error: 'Mungon video URL.' });
 
    // Mockup per Pinterest: krijon mockup nga dizajni i fundit dhe e ngarkon te Cloudinary.
    let pinterestUrl = req.query.design;
    if (!pinterestUrl) {
      try {
        pinterestUrl = await createMockupUrl(null);
      } catch (me) {
        console.error('Mockup gabim:', me.message);
      }
    }
 
    // Titulli/pershkrimi me AI (SEO)
    let text = req.query.text;
    let title = req.query.title;
    if (!text) {
      const cap = await generateVideoCaption(req.query.caption || '', req.query.animal || '');
      text = (cap.caption || '') + '\n\n' + (cap.hashtags || '');
      if (!title) title = cap.title || 'Funny design';
    }
    if (!title) title = 'Funny design';
 
    const results = [];
 
    // 1) VIDEO -> TikTok + Instagram
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
        '    mode: addToQueue,' +
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
 
    // 2) DIZAJNI (imazh) -> Pinterest (me link destinacioni)
    if (pinterestUrl) {
      const mutation =
        'mutation ($text: String!, $channelId: ChannelId!, $url: String!, $title: String!, $link: String!) {' +
        '  createPost(input: {' +
        '    text: $text,' +
        '    channelId: $channelId,' +
        '    schedulingType: automatic,' +
        '    mode: addToQueue,' +
        '    assets: [{ image: { url: $url } }],' +
        '    metadata: { pinterest: { title: $title, destinationUrl: $link } }' +
        '  }) {' +
        '    ... on PostActionSuccess { post { id dueAt } }' +
        '    ... on MutationError { message }' +
        '  }' +
        '}';
      const data = await bufferGraphQL(mutation, {
        text: text, channelId: CHANNELS.pinterest, url: pinterestUrl, title: title, link: SHOP_URL
      });
      results.push({ target: 'pinterest', channelId: CHANNELS.pinterest, response: data });
    }
 
    res.json({ ok: true, text: text, title: title, designUrl: pinterestUrl, results: results });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
 
module.exports = { router, bufferGraphQL, ORG_ID };
