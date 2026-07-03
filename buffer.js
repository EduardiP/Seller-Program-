// buffer.js — postimi automatik ne rrjetet sociale permes Buffer (GraphQL API).
const express = require('express');
const router = express.Router();
const { generateVideoCaption } = require('./ai');
 
const BUFFER_KEY = process.env.BUFFER_KEY;
const BUFFER_API = 'https://api.buffer.com';
const ORG_ID = '6a46593a27d1500618d57c54';
 
// ID-te e kanaleve te lidhura te Buffer.
const CHANNELS = {
  tiktok: '6a468c035ab6d2f1069885d9',
  instagram: '6a465b255ab6d2f106976fad',
  youtube: '6a468b3d5ab6d2f106987b32'
};
 
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
 
// INFO: tregon organizatat dhe kanalet (me ID-te e tyre).
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
 
// POST: dergon nje video te 3 kanalet me titull+hashtag (AI). Poston menjehere ne rradhe.
// Perdorim: /buffer/post?video=URL&caption=TEKSTI&animal=KAFSHA
router.get('/buffer/post', async function (req, res) {
  try {
    if (!BUFFER_KEY) return res.status(500).json({ ok: false, error: 'Mungon BUFFER_KEY te Railway.' });
    const videoUrl = req.query.video;
    if (!videoUrl) return res.status(400).json({ ok: false, error: 'Mungon video URL.' });
 
    // Titulli/pershkrimi me AI (SEO)
    let text = req.query.text;
    let title = req.query.title;
    if (!text) {
      const cap = await generateVideoCaption(req.query.caption || '', req.query.animal || '');
      text = (cap.caption || '') + '\n\n' + (cap.hashtags || '');
      if (!title) title = cap.title || 'Funny video';
    }
    if (!title) title = 'Funny video';
 
    // Secili kanal me konfigurimin e vet.
    const targets = [
      { channelId: CHANNELS.tiktok, meta: '' },
      { channelId: CHANNELS.instagram, meta: ', metadata: { instagram: { type: reel, shouldShareToFeed: true } }' },
      { channelId: CHANNELS.youtube, meta: ', metadata: { youtube: { title: $title } }' }
    ];
    const results = [];
 
    for (var i = 0; i < targets.length; i++) {
      const t = targets[i];
      const usesTitle = t.meta.indexOf('$title') !== -1;
      const varDefs = usesTitle
        ? '($text: String!, $channelId: ChannelId!, $url: String!, $title: String!)'
        : '($text: String!, $channelId: ChannelId!, $url: String!)';
      const mutation =
        'mutation ' + varDefs + ' {' +
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
      const vars = { text: text, channelId: t.channelId, url: videoUrl };
      if (usesTitle) vars.title = title;
      const data = await bufferGraphQL(mutation, vars);
      results.push({ channelId: t.channelId, response: data });
    }
 
    res.json({ ok: true, text: text, title: title, results: results });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
 
module.exports = { router, bufferGraphQL, ORG_ID };
