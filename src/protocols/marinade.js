const axios = require('axios');
const config = require('../config');

const MARINADE_API = 'https://api.marinade.finance';

let cachedData = null;
let cacheTimestamp = 0;

async function getMarinadeStats() {
  const now = Date.now();
  if (cachedData && now - cacheTimestamp < config.cacheTTL) {
    return cachedData;
  }

  try {
    const [apyRes, statsRes] = await Promise.all([
      axios.get(`${MARINADE_API}/msol/apy/30d`).catch(() => null),
      axios.get(`${MARINADE_API}/tlv`).catch(() => null),
    ]);

    cachedData = {
      protocol: 'Marinade Finance',
      token: 'mSOL',
      type: 'liquid-staking',
      apy: apyRes?.data?.value ? apyRes.data.value * 100 : null,
      tvl: statsRes?.data?.total_sol ? statsRes.data.total_sol : null,
      description: 'Liquid staking via mSOL - stake SOL and receive mSOL which appreciates in value',
      risks: ['smart-contract', 'validator-set'],
      minStake: 0,
      unstakeDelay: 'Instant via Jupiter, or 1-2 epochs direct',
    };
    cacheTimestamp = now;
  } catch (err) {
    if (cachedData) return cachedData;
    cachedData = {
      protocol: 'Marinade Finance',
      token: 'mSOL',
      type: 'liquid-staking',
      apy: null,
      tvl: null,
      description: 'Liquid staking via mSOL',
      risks: ['smart-contract', 'validator-set'],
      error: 'Failed to fetch live data',
    };
  }

  return cachedData;
}

module.exports = { getMarinadeStats };
