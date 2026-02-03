const API = '';

// Tab navigation
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');

    if (btn.dataset.tab === 'protocols') loadProtocols();
  });
});

// Formatting helpers
function formatUSD(value) {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function formatAPY(apy) {
  if (apy == null) return '--';
  return `${apy.toFixed(2)}%`;
}

function apyClass(apy) {
  if (apy >= 10) return 'apy-high';
  if (apy >= 3) return 'apy-medium';
  return 'apy-low';
}

// Load yields
async function loadYields() {
  const loading = document.getElementById('yields-loading');
  const container = document.getElementById('yields-table-container');
  loading.classList.remove('hidden');

  const stableOnly = document.getElementById('filter-stable').checked;
  const noIL = document.getElementById('filter-noil').checked;
  const minTvl = document.getElementById('filter-mintvl').value;

  try {
    const params = new URLSearchParams({ limit: '50', minTvl });
    if (stableOnly) params.set('stableOnly', 'true');
    if (noIL) params.set('noIL', 'true');

    const res = await fetch(`${API}/api/yields?${params}`);
    const { data } = await res.json();
    renderYieldsTable(data, container);
  } catch (err) {
    container.innerHTML = `<div class="card"><p>Failed to load yields: ${err.message}</p></div>`;
  }
  loading.classList.add('hidden');
}

function renderYieldsTable(yields, container) {
  if (!yields.length) {
    container.innerHTML = '<div class="card"><p>No pools found matching your criteria.</p></div>';
    return;
  }

  let html = `<table>
    <thead><tr>
      <th>Pool</th>
      <th>Protocol</th>
      <th>APY</th>
      <th>Base APY</th>
      <th>Reward APY</th>
      <th>TVL</th>
      <th>Tags</th>
    </tr></thead><tbody>`;

  for (const pool of yields) {
    const tags = [];
    if (pool.stablecoin) tags.push('<span class="tag tag-stable">Stable</span>');
    if (pool.ilRisk === 'yes') tags.push('<span class="tag tag-il">IL Risk</span>');

    html += `<tr>
      <td><strong>${pool.symbol}</strong></td>
      <td><span class="protocol-badge">${pool.project}</span></td>
      <td><span class="apy-value ${apyClass(pool.apy)}">${formatAPY(pool.apy)}</span></td>
      <td>${formatAPY(pool.apyBase)}</td>
      <td>${formatAPY(pool.apyReward)}</td>
      <td class="tvl-value">${formatUSD(pool.tvlUsd)}</td>
      <td>${tags.join(' ') || '--'}</td>
    </tr>`;
  }

  html += '</tbody></table>';
  container.innerHTML = html;
}

// Search
document.getElementById('search-btn').addEventListener('click', searchPools);
document.getElementById('search-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchPools();
});

async function searchPools() {
  const q = document.getElementById('search-input').value.trim();
  const container = document.getElementById('yields-table-container');
  if (!q) { loadYields(); return; }

  try {
    const res = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`);
    const { data } = await res.json();
    renderYieldsTable(data, container);
  } catch (err) {
    container.innerHTML = `<div class="card"><p>Search failed: ${err.message}</p></div>`;
  }
}

// Filters
document.getElementById('filter-stable').addEventListener('change', loadYields);
document.getElementById('filter-noil').addEventListener('change', loadYields);
document.getElementById('filter-mintvl').addEventListener('change', loadYields);

// Wallet analysis
document.getElementById('analyze-btn').addEventListener('click', analyzeWallet);
document.getElementById('wallet-address').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') analyzeWallet();
});

async function analyzeWallet() {
  const address = document.getElementById('wallet-address').value.trim();
  if (!address) return;

  const loading = document.getElementById('wallet-loading');
  const results = document.getElementById('wallet-results');
  loading.classList.remove('hidden');
  results.innerHTML = '';

  try {
    const [walletRes, recsRes] = await Promise.all([
      fetch(`${API}/api/wallet/${address}`),
      fetch(`${API}/api/wallet/${address}/recommendations?risk=medium`),
    ]);

    const walletData = await walletRes.json();
    const recsData = await recsRes.json();

    if (!walletData.success) throw new Error(walletData.error);

    renderWalletResults(walletData.data, recsData.data?.recommendations, results);
  } catch (err) {
    results.innerHTML = `<div class="card"><p>Analysis failed: ${err.message}</p></div>`;
  }
  loading.classList.add('hidden');
}

function renderWalletResults(portfolio, recs, container) {
  const { allocation } = portfolio;

  let html = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${formatUSD(portfolio.totalValueUsd)}</div>
        <div class="stat-label">Total Value</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${portfolio.holdings.length}</div>
        <div class="stat-label">Tokens</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${portfolio.summary.lstCount}</div>
        <div class="stat-label">Yield Positions</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${allocation.sol}%</div>
        <div class="stat-label">Unstaked SOL</div>
      </div>
    </div>

    <div class="card">
      <h3>Portfolio Allocation</h3>
      <div class="allocation-bar">
        <div class="alloc-segment alloc-sol" style="width: ${allocation.sol}%"></div>
        <div class="alloc-segment alloc-lst" style="width: ${allocation.lst}%"></div>
        <div class="alloc-segment alloc-stable" style="width: ${allocation.stablecoins}%"></div>
        <div class="alloc-segment alloc-other" style="width: ${allocation.other}%"></div>
      </div>
      <div class="allocation-legend">
        <div class="legend-item"><div class="legend-dot" style="background: var(--accent2)"></div>SOL (${allocation.sol}%)</div>
        <div class="legend-item"><div class="legend-dot" style="background: var(--accent)"></div>LST (${allocation.lst}%)</div>
        <div class="legend-item"><div class="legend-dot" style="background: var(--blue)"></div>Stables (${allocation.stablecoins}%)</div>
        <div class="legend-item"><div class="legend-dot" style="background: var(--text-dim)"></div>Other (${allocation.other}%)</div>
      </div>
    </div>

    <div class="card">
      <h3>Holdings</h3>
      <table>
        <thead><tr>
          <th>Token</th>
          <th>Amount</th>
          <th>Price</th>
          <th>Value</th>
          <th>Type</th>
        </tr></thead><tbody>`;

  for (const h of portfolio.holdings) {
    html += `<tr>
      <td><strong>${h.symbol}</strong></td>
      <td>${h.amount.toFixed(4)}</td>
      <td>${h.priceUsd ? formatUSD(h.priceUsd) : '--'}</td>
      <td>${formatUSD(h.valueUsd)}</td>
      <td>${h.isLST ? '<span class="tag tag-stable">LST</span>' : h.isStable ? '<span class="tag tag-stable">Stable</span>' : h.type}</td>
    </tr>`;
  }

  html += '</tbody></table></div>';

  // Recommendations
  if (recs && recs.recommendations && recs.recommendations.length > 0) {
    html += `<h3 style="margin: 20px 0 12px">Yield Recommendations</h3>
      <div class="risk-selector">
        <button class="risk-btn" data-risk="low">Low Risk</button>
        <button class="risk-btn active" data-risk="medium">Medium Risk</button>
        <button class="risk-btn" data-risk="high">High Risk</button>
      </div>
      <div id="recs-container">`;

    for (const rec of recs.recommendations) {
      html += `<div class="rec-card">
        <span class="rec-priority priority-${rec.priority}">${rec.priority}</span>
        <div class="rec-content">
          <h4>${rec.title}</h4>
          <p>${rec.description}</p>
          <div class="rec-meta">
            <span>Protocol: <strong>${rec.suggestedProtocol || '--'}</strong></span>
            <span>APY: <span class="yield">${formatAPY(rec.suggestedYield)}</span></span>
            ${rec.tvl ? `<span>TVL: ${formatUSD(rec.tvl)}</span>` : ''}
            ${rec.estimatedAnnualReturn ? `<span>Est. annual: <span class="yield">${formatUSD(rec.estimatedAnnualReturn)}</span></span>` : ''}
          </div>
        </div>
      </div>`;
    }
    html += '</div>';
  }

  container.innerHTML = html;

  // Risk selector handlers
  container.querySelectorAll('.risk-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      container.querySelectorAll('.risk-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const address = document.getElementById('wallet-address').value.trim();
      try {
        const res = await fetch(`${API}/api/wallet/${address}/recommendations?risk=${btn.dataset.risk}`);
        const data = await res.json();
        const recsContainer = document.getElementById('recs-container');
        if (data.data?.recommendations) {
          let recsHtml = '';
          for (const rec of data.data.recommendations.recommendations) {
            recsHtml += `<div class="rec-card">
              <span class="rec-priority priority-${rec.priority}">${rec.priority}</span>
              <div class="rec-content">
                <h4>${rec.title}</h4>
                <p>${rec.description}</p>
                <div class="rec-meta">
                  <span>Protocol: <strong>${rec.suggestedProtocol || '--'}</strong></span>
                  <span>APY: <span class="yield">${formatAPY(rec.suggestedYield)}</span></span>
                  ${rec.estimatedAnnualReturn ? `<span>Est. annual: <span class="yield">${formatUSD(rec.estimatedAnnualReturn)}</span></span>` : ''}
                </div>
              </div>
            </div>`;
          }
          recsContainer.innerHTML = recsHtml;
        }
      } catch (err) {
        console.error('Failed to load recommendations:', err);
      }
    });
  });
}

// Load protocols
async function loadProtocols() {
  const loading = document.getElementById('protocols-loading');
  const container = document.getElementById('protocols-container');
  loading.classList.remove('hidden');

  try {
    const res = await fetch(`${API}/api/protocols`);
    const { data } = await res.json();
    renderProtocols(data.protocols, container);
  } catch (err) {
    container.innerHTML = `<div class="card"><p>Failed to load: ${err.message}</p></div>`;
  }
  loading.classList.add('hidden');
}

function renderProtocols(protocols, container) {
  let html = '';
  for (const proto of protocols.slice(0, 30)) {
    html += `<div class="protocol-card">
      <div class="protocol-info">
        <h4>${proto.project}</h4>
        <p>${proto.pools} pools available</p>
      </div>
      <div class="protocol-stats">
        <div>
          <div class="protocol-stat-value">${formatUSD(proto.totalTvl)}</div>
          <div class="protocol-stat-label">Total TVL</div>
        </div>
        <div>
          <div class="protocol-stat-value apy-value ${apyClass(proto.maxApy)}">${formatAPY(proto.maxApy)}</div>
          <div class="protocol-stat-label">Max APY</div>
        </div>
        <div>
          <div class="protocol-stat-value">${formatAPY(proto.avgApy)}</div>
          <div class="protocol-stat-label">Avg APY</div>
        </div>
      </div>
    </div>`;
  }
  container.innerHTML = html;
}

// Initial load
loadYields();
