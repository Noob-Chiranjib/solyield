const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const apiRoutes = require('./api/routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'solyield', timestamp: new Date().toISOString() });
});

// SPA fallback (Express 5 syntax)
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server in local dev, export for Vercel
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`SolYield running on http://localhost:${config.port}`);
  });
}

module.exports = app;
