'use strict';
require('dotenv').config({ quiet: true });
const app = require('./app');

const PORT = parseInt(process.env.PORT) || 5000;

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

const server = app.listen(PORT, () => {
  console.log(`[server] Cyber Café API running on http://localhost:${PORT}`);
});

module.exports = server;
