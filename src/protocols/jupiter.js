const axios = require('axios');
const config = require('../config');

const JUPITER_API = 'https://quote-api.jup.ag/v6';
const JUPITER_PRICE_API = 'https://price.jup.ag/v6';
const JUPITER_TOKEN_API = 'https://token.jup.ag';

async function getSwapQuote(inputMint, outputMint, amount, slippageBps = 50) {
  const { data } = await axios.get(`${JUPITER_API}/quote`, {
    params: {
      inputMint,
      outputMint,
      amount: amount.toString(),
      slippageBps,
    },
  });
  return {
    inputMint,
    outputMint,
    inAmount: data.inAmount,
    outAmount: data.outAmount,
    priceImpactPct: data.priceImpactPct,
    routePlan: data.routePlan?.map((r) => ({
      swapInfo: {
        ammKey: r.swapInfo?.ammKey,
        label: r.swapInfo?.label,
        feeAmount: r.swapInfo?.feeAmount,
        feeMint: r.swapInfo?.feeMint,
      },
      percent: r.percent,
    })),
    otherAmountThreshold: data.otherAmountThreshold,
  };
}

async function getTokenPrices(tokenMints) {
  const ids = Array.isArray(tokenMints) ? tokenMints.join(',') : tokenMints;
  const { data } = await axios.get(`${JUPITER_PRICE_API}/price`, {
    params: { ids },
  });
  return data.data;
}

async function getTokenList() {
  const { data } = await axios.get(`${JUPITER_TOKEN_API}/strict`);
  return data;
}

module.exports = { getSwapQuote, getTokenPrices, getTokenList };
