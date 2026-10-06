'use strict';
require('dotenv').config();
const app = require('./app');

const PORT = parseInt(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`[server] Cyber Café API running on http://localhost:${PORT}`);
});
