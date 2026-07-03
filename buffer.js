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
      '{ account { organizations { id name channels { id service name } } } }';
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
    if (!text) {
      const cap = await generateVideoCaption(req.query.caption || '', req.query.animal || '');
      text = (cap.caption || '') + '\n\n' + (cap.hashtags || '');
    }
 
    const channelIds = [CHANNELS.tiktok, CHANNELS.instagram, CHANNELS.youtube];
    const results = [];
 
    for (var i = 0; i < channelIds.length; i++) {
      const mutation =
        'mutation ($text: String!, $channelId: ChannelId!, $url: String!) {' +
        '  createPost(input: {' +
        '    text: $text,' +
        '    channelId: $channelId,' +
        '    schedulingType: automatic,' +
        '    mode: addToQueue,' +
        '    assets: [{ video: { url: $url } }]' +
        '  }) {' +
        '    ... on PostActionSuccess { post { id dueAt } }' +
        '    ... on MutationError { message }' +
        '  }' +
        '}';
      const data = await bufferGraphQL(mutation, { text: text, channelId: channelIds[i], url: videoUrl });
      results.push({ channelId: channelIds[i], response: data });
    }
 
    res.json({ ok: true, text: text, results: results });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
 
module.exports = { router, bufferGraphQL, ORG_ID };
