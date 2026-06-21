const express = require('express');
const { initDb } = require('./db');
const auth = require('./auth');

const app = express();
app.use(express.json({ limit: '15mb' }));

const PORT = process.env.PORT || 3000;

app.use('/', auth.router);          // sign-in: /me, /register
app.use('/', require('./products').router);  // Printify
// app.use('/', require('./ai').router);        // me vone

app.get('/health', (req, res) => res.send('OK'));
app.get('/', (req, res) => res.send('Seller program backend eshte gjalle.'));

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Serveri po degjon ne portin ${PORT}`));
  })
  .catch((err) => {
    console.error('Deshtoi init i DB:', err);
    process.exit(1);
  });
