const axios = require('axios');
const config = require('../config');

const LLAMA_YIELDS_URL = 'https://yields.llama.fi/pools';
const LLAMA_PROTOCOLS_URL = 'https://api.llama.fi/protocols';

let cachedPools = null;
let cacheTimestamp = 0;

async function fetchSolanaYieldPools() {
  const now = Date.now();
  if (cachedPools && now - cacheTimestamp < config.cacheTTL) {
    return cachedPools;
  }

  const { data } = await axios.get(LLAMA_YIELDS_URL);
  const solanaPools = data.data.filter(
    (pool) => pool.chain === 'Solana' && pool.tvlUsd > 10000
  );

  cachedPools = solanaPools.map((pool) => ({
    pool: pool.pool,
    project: pool.project,
    symbol: pool.symbol,
    tvlUsd: pool.tvlUsd,
    apy: pool.apy,
    apyBase: pool.apyBase,
    apyReward: pool.apyReward,
    rewardTokens: pool.rewardTokens,
    underlyingTokens: pool.underlyingTokens,
    poolMeta: pool.poolMeta,
    ilRisk: pool.ilRisk,
    stablecoin: pool.stablecoin,
    exposure: pool.exposure,
  }));

  cacheTimestamp = now;
  return cachedPools;
}

async function getTopYields(limit = 20, options = {}) {
  const pools = await fetchSolanaYieldPools();

  let filtered = pools;

  if (options.minTvl) {
    filtered = filtered.filter((p) => p.tvlUsd >= options.minTvl);
  }
  if (options.stableOnly) {
    filtered = filtered.filter((p) => p.stablecoin);
  }
  if (options.project) {
    filtered = filtered.filter(
      (p) => p.project.toLowerCase() === options.project.toLowerCase()
    );
  }
  if (options.noIL) {
    filtered = filtered.filter((p) => p.ilRisk !== 'yes');
  }

  filtered.sort((a, b) => (b.apy || 0) - (a.apy || 0));
  return filtered.slice(0, limit);
}

async function getYieldsByProtocol() {
  const pools = await fetchSolanaYieldPools();
  const byProtocol = {};

  for (const pool of pools) {
    if (!byProtocol[pool.project]) {
      byProtocol[pool.project] = {
        project: pool.project,
        pools: 0,
        totalTvl: 0,
        avgApy: 0,
        maxApy: 0,
        apySum: 0,
      };
    }
    const proto = byProtocol[pool.project];
    proto.pools++;
    proto.totalTvl += pool.tvlUsd || 0;
    proto.apySum += pool.apy || 0;
    proto.maxApy = Math.max(proto.maxApy, pool.apy || 0);
  }

  for (const key of Object.keys(byProtocol)) {
    byProtocol[key].avgApy = byProtocol[key].apySum / byProtocol[key].pools;
    delete byProtocol[key].apySum;
  }

  return Object.values(byProtocol).sort((a, b) => b.totalTvl - a.totalTvl);
}

async function searchPools(query) {
  const pools = await fetchSolanaYieldPools();
  const q = query.toLowerCase();
  return pools.filter(
    (p) =>
      p.symbol.toLowerCase().includes(q) ||
      p.project.toLowerCase().includes(q)
  );
}

module.exports = {
  fetchSolanaYieldPools,
  getTopYields,
  getYieldsByProtocol,
  searchPools,
};
