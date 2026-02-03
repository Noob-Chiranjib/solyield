const { getSolBalance, getTokenAccounts } = require('../utils/solana');
const { getTokenInfo, isLST, isStablecoin, getTokenPricesUSD, LST_TOKENS } = require('./tokens');
const { defiLlama } = require('../protocols');

async function analyzeWallet(walletAddress) {
  const [solBalance, tokenAccounts] = await Promise.all([
    getSolBalance(walletAddress),
    getTokenAccounts(walletAddress),
  ]);

  // Get all mints for price lookup
  const mints = [
    'So11111111111111111111111111111111111111112',
    ...tokenAccounts.map((t) => t.mint),
  ];
  const prices = await getTokenPricesUSD(mints);

  const solPrice = prices['So11111111111111111111111111111111111111112'] || 0;

  // Build holdings
  const holdings = [];

  // SOL balance
  holdings.push({
    mint: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    name: 'Solana',
    amount: solBalance,
    priceUsd: solPrice,
    valueUsd: solBalance * solPrice,
    type: 'native',
    isLST: false,
    isStable: false,
  });

  // Token balances
  for (const token of tokenAccounts) {
    const info = getTokenInfo(token.mint);
    const price = prices[token.mint] || 0;
    holdings.push({
      mint: token.mint,
      symbol: info?.symbol || token.mint.slice(0, 8) + '...',
      name: info?.name || 'Unknown Token',
      amount: token.amount,
      priceUsd: price,
      valueUsd: token.amount * price,
      type: info?.type || 'token',
      protocol: info?.protocol || null,
      isLST: isLST(token.mint),
      isStable: isStablecoin(token.mint),
    });
  }

  holdings.sort((a, b) => b.valueUsd - a.valueUsd);

  const totalValue = holdings.reduce((sum, h) => sum + h.valueUsd, 0);
  const lstValue = holdings.filter((h) => h.isLST).reduce((sum, h) => sum + h.valueUsd, 0);
  const stableValue = holdings.filter((h) => h.isStable).reduce((sum, h) => sum + h.valueUsd, 0);
  const solValue = holdings.find((h) => h.symbol === 'SOL')?.valueUsd || 0;

  // Identify yield-bearing positions
  const yieldPositions = holdings.filter((h) => h.isLST).map((h) => ({
    ...h,
    estimatedApy: null, // Will be filled by yield data
  }));

  // Calculate allocation breakdown
  const allocation = {
    sol: totalValue > 0 ? ((solValue / totalValue) * 100).toFixed(1) : '0',
    lst: totalValue > 0 ? ((lstValue / totalValue) * 100).toFixed(1) : '0',
    stablecoins: totalValue > 0 ? ((stableValue / totalValue) * 100).toFixed(1) : '0',
    other: totalValue > 0 ? ((((totalValue - solValue - lstValue - stableValue) / totalValue) * 100)).toFixed(1) : '0',
  };

  return {
    wallet: walletAddress,
    totalValueUsd: totalValue,
    holdings,
    yieldPositions,
    allocation,
    summary: {
      tokenCount: holdings.length,
      lstCount: holdings.filter((h) => h.isLST).length,
      hasStakedSol: lstValue > 0,
      unstaked_sol_pct: allocation.sol,
    },
    analyzedAt: new Date().toISOString(),
  };
}

module.exports = { analyzeWallet };
