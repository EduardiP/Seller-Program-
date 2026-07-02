// buffer.js — postimi automatik ne rrjetet sociale permes Buffer (GraphQL API).
const express = require('express');
const router = express.Router();

const BUFFER_KEY = process.env.BUFFER_KEY;
const BUFFER_API = 'https://api.buffer.com';
const ORG_ID = '6a46593a27d1500618d57c54';

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
      '{ channels { id service name } account { organizations { id name } } }';
    const data = await bufferGraphQL(query);
    res.json({ ok: true, data: data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = { router, bufferGraphQL, ORG_ID };
