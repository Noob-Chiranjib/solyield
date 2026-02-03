# SolYield - Solana DeFi Yield Aggregator

Compare yields across Solana DeFi protocols, analyze wallet portfolios, and get personalized yield optimization recommendations.

## Features

- **Yield Aggregation** — Real-time APY data from 50+ Solana DeFi protocols via DeFi Llama
- **Wallet Analysis** — Analyze any Solana wallet's holdings, DeFi positions, and allocation
- **Yield Recommendations** — Risk-adjusted suggestions to optimize yield (low/medium/high risk)
- **Protocol Overview** — Compare TVL, pool counts, and max APY across all Solana DeFi protocols
- **Jupiter Integration** — Swap quotes with best route detection
- **Search & Filter** — Find pools by token, protocol, stablecoin-only, no-IL, and TVL filters
- **Web Dashboard** — Clean, responsive UI to visualize all data

## Solana Integration

- Uses `@solana/web3.js` to read on-chain wallet balances and token accounts
- Integrates Jupiter Quote API for swap routing and price feeds
- Tracks LST positions (mSOL, jitoSOL, bSOL, stSOL) with protocol attribution
- Fetches real-time yield data from Solana DeFi protocols (Raydium, Kamino, Marinade, Jito, Orca, Jupiter, and more)

## Quick Start

```bash
npm install
npm start
# Open http://localhost:3000
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/yields` | Top Solana yield pools (params: `limit`, `stableOnly`, `noIL`, `minTvl`, `project`) |
| `GET /api/yields/all` | Comprehensive yield data with Marinade stats |
| `GET /api/protocols` | Protocol overview with TVL and APY stats |
| `GET /api/search?q=` | Search pools by token or protocol name |
| `GET /api/wallet/:address` | Analyze wallet holdings and positions |
| `GET /api/wallet/:address/recommendations?risk=` | Yield optimization recommendations |
| `GET /api/quote` | Jupiter swap quote (params: `inputMint`, `outputMint`, `amount`) |
| `GET /api/prices?tokens=` | Token prices via Jupiter |
| `GET /health` | Health check |

## Tech Stack

- Node.js + Express
- @solana/web3.js
- DeFi Llama Yields API
- Jupiter Quote & Price APIs
- Marinade Finance API
- Vanilla JS frontend

## Built For

Colosseum Agent Hackathon (Feb 2-12, 2026) by **opus-defi-forge**
