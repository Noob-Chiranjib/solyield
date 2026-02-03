const { defiLlama } = require('../protocols');
const { LST_TOKENS } = require('../portfolio/tokens');

const RISK_LEVELS = {
  low: { maxIL: false, minTvl: 10_000_000, stablePreferred: true },
  medium: { maxIL: true, minTvl: 1_000_000, stablePreferred: false },
  high: { maxIL: true, minTvl: 100_000, stablePreferred: false },
};

async function getRecommendations(portfolio, riskLevel = 'medium') {
  const riskConfig = RISK_LEVELS[riskLevel] || RISK_LEVELS.medium;
  const recommendations = [];

  const topYields = await defiLlama.getTopYields(100, {
    minTvl: riskConfig.minTvl,
    noIL: !riskConfig.maxIL,
  });

  // 1. Unstaked SOL recommendation
  const solHolding = portfolio.holdings.find((h) => h.symbol === 'SOL');
  if (solHolding && solHolding.valueUsd > 10) {
    const lstYields = topYields.filter(
      (p) =>
        p.symbol.toLowerCase().includes('sol') &&
        (p.project === 'marinade-finance' ||
          p.project === 'jito' ||
          p.project === 'blazestake' ||
          p.project === 'sanctum')
    );

    const bestLST = lstYields.sort((a, b) => (b.apy || 0) - (a.apy || 0))[0];

    recommendations.push({
      type: 'stake-sol',
      priority: 'high',
      title: 'Stake idle SOL for yield',
      description: `You have ${solHolding.amount.toFixed(2)} SOL ($${solHolding.valueUsd.toFixed(2)}) sitting idle. Liquid staking earns yield while keeping your SOL liquid.`,
      currentYield: 0,
      suggestedYield: bestLST?.apy || 7,
      suggestedProtocol: bestLST?.project || 'marinade-finance',
      suggestedPool: bestLST?.symbol || 'mSOL',
      estimatedAnnualReturn: solHolding.valueUsd * ((bestLST?.apy || 7) / 100),
      action: 'Swap SOL for mSOL, jitoSOL, or bSOL via Jupiter',
    });
  }

  // 2. Stablecoin yield recommendations
  const stableHoldings = portfolio.holdings.filter((h) => h.isStable);
  if (stableHoldings.length > 0) {
    const stableYields = topYields
      .filter(
        (p) =>
          p.stablecoin &&
          p.tvlUsd > riskConfig.minTvl
      )
      .sort((a, b) => (b.apy || 0) - (a.apy || 0));

    const bestStable = stableYields[0];
    const totalStableValue = stableHoldings.reduce((s, h) => s + h.valueUsd, 0);

    if (bestStable && totalStableValue > 10) {
      recommendations.push({
        type: 'stablecoin-yield',
        priority: 'medium',
        title: 'Earn yield on stablecoins',
        description: `You have $${totalStableValue.toFixed(2)} in stablecoins earning nothing. Deploy to lending or LP pools for yield.`,
        currentYield: 0,
        suggestedYield: bestStable.apy,
        suggestedProtocol: bestStable.project,
        suggestedPool: bestStable.symbol,
        tvl: bestStable.tvlUsd,
        estimatedAnnualReturn: totalStableValue * (bestStable.apy / 100),
        action: `Deposit into ${bestStable.project} ${bestStable.symbol} pool`,
      });
    }
  }

  // 3. LST optimization - check if there's a better-yielding LST
  const lstHoldings = portfolio.holdings.filter((h) => h.isLST);
  for (const lst of lstHoldings) {
    const lstYields = topYields.filter(
      (p) =>
        p.symbol.toLowerCase().includes(lst.symbol.toLowerCase()) ||
        (p.project === lst.protocol)
    );

    const higherYield = topYields.find(
      (p) =>
        p.symbol.toLowerCase().includes('sol') &&
        !p.ilRisk &&
        p.tvlUsd > riskConfig.minTvl &&
        (p.apy || 0) > (lstYields[0]?.apy || 0) + 1
    );

    if (higherYield) {
      recommendations.push({
        type: 'lst-optimize',
        priority: 'low',
        title: `Consider switching from ${lst.symbol}`,
        description: `${higherYield.project} offers ${higherYield.apy?.toFixed(1)}% APY vs your current position. Consider rebalancing.`,
        currentYield: lstYields[0]?.apy || 0,
        suggestedYield: higherYield.apy,
        suggestedProtocol: higherYield.project,
        suggestedPool: higherYield.symbol,
        estimatedExtraReturn: lst.valueUsd * ((higherYield.apy - (lstYields[0]?.apy || 0)) / 100),
      });
    }
  }

  // 4. DeFi LP opportunities (for medium/high risk)
  if (riskLevel !== 'low' && portfolio.totalValueUsd > 100) {
    const lpYields = topYields
      .filter((p) => p.apy > 15 && p.tvlUsd > riskConfig.minTvl)
      .slice(0, 3);

    for (const lp of lpYields) {
      recommendations.push({
        type: 'lp-opportunity',
        priority: riskLevel === 'high' ? 'medium' : 'low',
        title: `LP opportunity: ${lp.symbol}`,
        description: `${lp.project} ${lp.symbol} pool offers ${lp.apy?.toFixed(1)}% APY with $${(lp.tvlUsd / 1e6).toFixed(1)}M TVL.`,
        suggestedYield: lp.apy,
        suggestedProtocol: lp.project,
        suggestedPool: lp.symbol,
        tvl: lp.tvlUsd,
        ilRisk: lp.ilRisk === 'yes',
        action: `Provide liquidity to ${lp.project} ${lp.symbol}`,
      });
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  // Calculate total potential gain
  const totalPotentialGain = recommendations.reduce(
    (sum, r) => sum + (r.estimatedAnnualReturn || r.estimatedExtraReturn || 0),
    0
  );

  return {
    riskLevel,
    recommendations,
    totalPotentialAnnualGain: totalPotentialGain,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { getRecommendations, RISK_LEVELS };
