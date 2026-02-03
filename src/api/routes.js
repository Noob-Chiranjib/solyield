const express = require('express');
const { getAllYields, getProtocolOverview, defiLlama, jupiter } = require('../protocols');
const { analyzeWallet } = require('../portfolio/analyzer');
const { getRecommendations } = require('../optimizer/recommender');
const { isValidSolanaAddress } = require('../utils/solana');

const router = express.Router();

// GET /api/yields - Top yields on Solana
router.get('/yields', async (req, res) => {
  try {
    const { limit, stableOnly, project, noIL, minTvl } = req.query;
    const yields = await defiLlama.getTopYields(
      parseInt(limit) || 20,
      {
        stableOnly: stableOnly === 'true',
        project,
        noIL: noIL === 'true',
        minTvl: minTvl ? parseInt(minTvl) : undefined,
      }
    );
    res.json({ success: true, count: yields.length, data: yields });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/yields/all - Comprehensive yield data
router.get('/yields/all', async (req, res) => {
  try {
    const data = await getAllYields({ limit: parseInt(req.query.limit) || 50 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/protocols - Protocol overview
router.get('/protocols', async (req, res) => {
  try {
    const data = await getProtocolOverview();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/search - Search yield pools
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'Query parameter q is required' });
    const results = await defiLlama.searchPools(q);
    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/wallet/:address - Analyze wallet
router.get('/wallet/:address', async (req, res) => {
  try {
    const { address } = req.params;
    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ success: false, error: 'Invalid Solana address' });
    }
    const portfolio = await analyzeWallet(address);
    res.json({ success: true, data: portfolio });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/wallet/:address/recommendations - Get yield recommendations
router.get('/wallet/:address/recommendations', async (req, res) => {
  try {
    const { address } = req.params;
    const { risk } = req.query;
    if (!isValidSolanaAddress(address)) {
      return res.status(400).json({ success: false, error: 'Invalid Solana address' });
    }
    const portfolio = await analyzeWallet(address);
    const recommendations = await getRecommendations(portfolio, risk || 'medium');
    res.json({ success: true, data: { portfolio: { wallet: portfolio.wallet, totalValueUsd: portfolio.totalValueUsd, allocation: portfolio.allocation }, recommendations } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/quote - Get swap quote via Jupiter
router.get('/quote', async (req, res) => {
  try {
    const { inputMint, outputMint, amount, slippage } = req.query;
    if (!inputMint || !outputMint || !amount) {
      return res.status(400).json({ success: false, error: 'inputMint, outputMint, and amount are required' });
    }
    const quote = await jupiter.getSwapQuote(inputMint, outputMint, amount, parseInt(slippage) || 50);
    res.json({ success: true, data: quote });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/prices - Get token prices
router.get('/prices', async (req, res) => {
  try {
    const { tokens } = req.query;
    if (!tokens) return res.status(400).json({ success: false, error: 'tokens parameter required (comma-separated mints)' });
    const prices = await jupiter.getTokenPrices(tokens);
    res.json({ success: true, data: prices });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
