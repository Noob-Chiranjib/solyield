const axios = require('axios');
const config = require('../config');

const KNOWN_TOKENS = {
  So11111111111111111111111111111111111111112: { symbol: 'SOL', name: 'Solana', decimals: 9 },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: { symbol: 'mSOL', name: 'Marinade SOL', decimals: 9, protocol: 'marinade', type: 'liquid-staking' },
  J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn: { symbol: 'jitoSOL', name: 'Jito SOL', decimals: 9, protocol: 'jito', type: 'liquid-staking' },
  bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1: { symbol: 'bSOL', name: 'BlazeStake SOL', decimals: 9, protocol: 'blazestake', type: 'liquid-staking' },
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': { symbol: 'stSOL', name: 'Lido SOL', decimals: 9, protocol: 'lido', type: 'liquid-staking' },
  '7Q2afV64in6N6SeZsAAB81TJzwpeLmHCRHCPB3faixJM': { symbol: 'INF', name: 'Sanctum Infinity', decimals: 9, protocol: 'sanctum', type: 'liquid-staking' },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: { symbol: 'BONK', name: 'Bonk', decimals: 5 },
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: { symbol: 'JUP', name: 'Jupiter', decimals: 6 },
};

const LST_TOKENS = Object.entries(KNOWN_TOKENS)
  .filter(([, info]) => info.type === 'liquid-staking')
  .map(([mint, info]) => ({ mint, ...info }));

function getTokenInfo(mint) {
  return KNOWN_TOKENS[mint] || null;
}

function isLST(mint) {
  const info = KNOWN_TOKENS[mint];
  return info?.type === 'liquid-staking';
}

function isStablecoin(mint) {
  const info = KNOWN_TOKENS[mint];
  return info?.symbol === 'USDC' || info?.symbol === 'USDT';
}

async function getTokenPricesUSD(mints) {
  try {
    const ids = mints.join(',');
    const { data } = await axios.get(`https://price.jup.ag/v6/price`, {
      params: { ids },
    });
    const prices = {};
    for (const [mint, priceData] of Object.entries(data.data || {})) {
      prices[mint] = priceData.price;
    }
    return prices;
  } catch {
    return {};
  }
}

module.exports = { KNOWN_TOKENS, LST_TOKENS, getTokenInfo, isLST, isStablecoin, getTokenPricesUSD };
