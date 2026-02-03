const defiLlama = require('./defi-llama');
const marinade = require('./marinade');
const jupiter = require('./jupiter');

async function getAllYields(options = {}) {
  const [llamaYields, marinadeStats] = await Promise.all([
    defiLlama.getTopYields(options.limit || 50, options),
    marinade.getMarinadeStats(),
  ]);

  return {
    topYields: llamaYields,
    marinade: marinadeStats,
    fetchedAt: new Date().toISOString(),
  };
}

async function getProtocolOverview() {
  const [protocols, marinadeStats] = await Promise.all([
    defiLlama.getYieldsByProtocol(),
    marinade.getMarinadeStats(),
  ]);

  return {
    protocols,
    marinadeDetail: marinadeStats,
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = {
  getAllYields,
  getProtocolOverview,
  defiLlama,
  marinade,
  jupiter,
};
