const API = '';

// Tab navigation
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');

    if (btn.dataset.tab === 'protocols') loadProtocols();
    if (btn.dataset.tab === 'yields') loadYields();
  });
});

// Formatting helpers
function formatUSD(value) {
  if (value == null) return '--';
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function formatAPY(apy) {
  if (apy == null) return '--';
  if (apy >= 1000) return `${(apy / 1000).toFixed(1)}K%`;
  return `${apy.toFixed(2)}%`;
}

function apyClass(apy) {
  if (apy >= 10) return 'apy-high';
  if (apy >= 3) return 'apy-medium';
  return 'apy-low';
}

function renderBarChart(container, items, maxVal, colorClass = 'bar-fill-green') {
  const colors = ['bar-fill-green', 'bar-fill-purple', 'bar-fill-blue', 'bar-fill-cyan'];
  let html = '<div class="bar-chart">';
  items.forEach((item, i) => {
    const pct = maxVal > 0 ? Math.min((item.value / maxVal) * 100, 100) : 0;
    const color = typeof colorClass === 'string' ? colorClass : colors[i % colors.length];
    html += `<div class="bar-row">
      <div class="bar-label" title="${item.label}">${item.label}</div>
      <div class="bar-track">
        <div class="bar-fill ${color}" style="width: ${pct}%">
          ${pct > 15 ? `<span class="bar-value">${item.display}</span>` : ''}
        </div>
      </div>
      ${pct <= 15 ? `<span class="bar-extra">${item.display}</span>` : '<span class="bar-extra"></span>'}
    </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

// ========== DASHBOARD ==========
async function loadDashboard() {
  try {
    const [yieldsRes, protocolsRes] = await Promise.all([
      fetch(`${API}/api/yields?limit=50&minTvl=1000000`),
      fetch(`${API}/api/protocols`),
    ]);
    const yieldsData = await yieldsRes.json();
    const protocolsData = await protocolsRes.json();

    const pools = yieldsData.data || [];
    const protocols = protocolsData.data?.protocols || [];

    // Stats
    const totalTvl = protocols.reduce((s, p) => s + p.totalTvl, 0);
    const totalPools = protocols.reduce((s, p) => s + p.pools, 0);
    const avgApy = pools.length ? pools.reduce((s, p) => s + (p.apy || 0), 0) / pools.length : 0;
    const topProtocol = protocols[0]?.project || '--';

    document.getElementById('dashboard-stats').innerHTML = `
      <div class="stat-card"><div class="stat-value">${formatUSD(totalTvl)}</div><div class="stat-label">Total Solana DeFi TVL</div></div>
      <div class="stat-card"><div class="stat-value">${totalPools.toLocaleString()}</div><div class="stat-label">Active Pools</div></div>
      <div class="stat-card"><div class="stat-value">${protocols.length}</div><div class="stat-label">Protocols Tracked</div></div>
      <div class="stat-card"><div class="stat-value">${formatAPY(avgApy)}</div><div class="stat-label">Avg APY (TVL>$1M)</div></div>
    `;

    // Top Yields bar chart - top 8 pools by TVL with their APY
    const topByTvl = [...pools].filter(p => p.apy && p.apy < 500).sort((a, b) => b.tvlUsd - a.tvlUsd).slice(0, 8);
    const maxApy = Math.max(...topByTvl.map(p => p.apy || 0));
    renderBarChart(
      document.getElementById('top-yields-chart'),
      topByTvl.map(p => ({ label: p.symbol, value: p.apy, display: formatAPY(p.apy) })),
      maxApy,
      'mixed'
    );

    // LST rates
    const lstPools = pools.filter(p =>
      (p.symbol.includes('SOL') || p.symbol.includes('mSOL') || p.symbol.includes('jitoSOL') || p.symbol.includes('bSOL')) &&
      !p.symbol.includes('-') && p.apy && p.apy < 20 && p.tvlUsd > 1000000
    ).sort((a, b) => b.tvlUsd - a.tvlUsd).slice(0, 6);

    if (lstPools.length) {
      const maxLst = Math.max(...lstPools.map(p => p.apy));
      renderBarChart(
        document.getElementById('lst-rates-chart'),
        lstPools.map(p => ({ label: `${p.symbol} (${p.project})`, value: p.apy, display: formatAPY(p.apy) })),
        maxLst,
        'bar-fill-purple'
      );
    } else {
      document.getElementById('lst-rates-chart').innerHTML = '<p class="text-dim" style="padding:20px;text-align:center;">Loading LST data...</p>';
    }

    // Trending pools - high APY with decent TVL
    const trending = [...pools].filter(p => p.apy && p.apy > 5 && p.apy < 500 && p.tvlUsd > 500000)
      .sort((a, b) => (b.apy || 0) - (a.apy || 0)).slice(0, 6);

    let trendingHtml = '<div class="trending-grid">';
    for (const p of trending) {
      trendingHtml += `<div class="trending-card">
        <div class="trending-header">
          <div>
            <div class="trending-symbol">${p.symbol}</div>
            <span class="protocol-badge">${p.project}</span>
          </div>
          <div class="trending-apy ${apyClass(p.apy)}">${formatAPY(p.apy)}</div>
        </div>
        <div class="trending-meta">
          <span>TVL: ${formatUSD(p.tvlUsd)}</span>
          ${p.stablecoin ? '<span class="tag tag-stable">Stable</span>' : ''}
          ${p.ilRisk === 'yes' ? '<span class="tag tag-il">IL Risk</span>' : ''}
        </div>
      </div>`;
    }
    trendingHtml += '</div>';
    document.getElementById('trending-container').innerHTML = trendingHtml;

    // Stablecoin yields
    const stables = [...pools].filter(p => p.stablecoin && p.apy && p.tvlUsd > 500000)
      .sort((a, b) => (b.apy || 0) - (a.apy || 0)).slice(0, 6);

    let stableHtml = '<div class="trending-grid">';
    for (const p of stables) {
      stableHtml += `<div class="trending-card">
        <div class="trending-header">
          <div>
            <div class="trending-symbol">${p.symbol}</div>
            <span class="protocol-badge">${p.project}</span>
          </div>
          <div class="trending-apy ${apyClass(p.apy)}">${formatAPY(p.apy)}</div>
        </div>
        <div class="trending-meta">
          <span>TVL: ${formatUSD(p.tvlUsd)}</span>
          <span class="tag tag-stable">Stable</span>
        </div>
      </div>`;
    }
    stableHtml += '</div>';
    document.getElementById('stable-yields-container').innerHTML = stableHtml;

  } catch (err) {
    document.getElementById('dashboard-stats').innerHTML = `<div class="card"><p>Failed to load dashboard: ${err.message}</p></div>`;
  }
}

// ========== YIELDS ==========
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
    container.innerHTML = '<div class="card"><p class="text-dim">No pools found matching your criteria.</p></div>';
    return;
  }

  let html = `<table>
    <thead><tr>
      <th>#</th>
      <th>Pool</th>
      <th>Protocol</th>
      <th>APY</th>
      <th>Base</th>
      <th>Reward</th>
      <th>TVL</th>
      <th>Tags</th>
    </tr></thead><tbody>`;

  yields.forEach((pool, i) => {
    const tags = [];
    if (pool.stablecoin) tags.push('<span class="tag tag-stable">Stable</span>');
    if (pool.ilRisk === 'yes') tags.push('<span class="tag tag-il">IL</span>');

    html += `<tr>
      <td class="text-dim">${i + 1}</td>
      <td><strong>${pool.symbol}</strong></td>
      <td><span class="protocol-badge">${pool.project}</span></td>
      <td><span class="apy-value ${apyClass(pool.apy)}">${formatAPY(pool.apy)}</span></td>
      <td class="text-dim">${formatAPY(pool.apyBase)}</td>
      <td class="text-dim">${formatAPY(pool.apyReward)}</td>
      <td class="tvl-value">${formatUSD(pool.tvlUsd)}</td>
      <td>${tags.join(' ') || '--'}</td>
    </tr>`;
  });

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

// ========== WALLET ==========
document.getElementById('analyze-btn').addEventListener('click', analyzeWallet);
document.getElementById('wallet-address').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') analyzeWallet();
});

// Example wallet buttons
document.querySelectorAll('.example-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById('wallet-address').value = btn.dataset.addr;
    analyzeWallet();
  });
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
      <div class="stat-card"><div class="stat-value">${formatUSD(portfolio.totalValueUsd)}</div><div class="stat-label">Total Value</div></div>
      <div class="stat-card"><div class="stat-value">${portfolio.holdings.length}</div><div class="stat-label">Tokens</div></div>
      <div class="stat-card"><div class="stat-value">${portfolio.summary.lstCount}</div><div class="stat-label">Yield Positions</div></div>
      <div class="stat-card"><div class="stat-value">${allocation.sol}%</div><div class="stat-label">Unstaked SOL</div></div>
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
        <thead><tr><th>Token</th><th>Amount</th><th>Price</th><th>Value</th><th>Type</th></tr></thead><tbody>`;

  for (const h of portfolio.holdings) {
    const typeTag = h.isLST ? '<span class="tag tag-lst">LST</span>' : h.isStable ? '<span class="tag tag-stable">Stable</span>' : `<span class="text-dim">${h.type}</span>`;
    html += `<tr>
      <td><strong>${h.symbol}</strong></td>
      <td>${h.amount.toFixed(4)}</td>
      <td>${h.priceUsd ? formatUSD(h.priceUsd) : '--'}</td>
      <td>${formatUSD(h.valueUsd)}</td>
      <td>${typeTag}</td>
    </tr>`;
  }

  html += '</tbody></table></div>';

  // Recommendations
  if (recs && recs.recommendations && recs.recommendations.length > 0) {
    html += `<h3 style="margin: 20px 0 12px">Yield Recommendations</h3>
      <div class="risk-selector">
        <button class="risk-btn" data-risk="low">Low Risk</button>
        <button class="risk-btn active" data-risk="medium">Medium</button>
        <button class="risk-btn" data-risk="high">High Risk</button>
      </div>
      <div id="recs-container">`;
    html += renderRecs(recs.recommendations);
    html += '</div>';
  }

  container.innerHTML = html;
  attachRiskHandlers(container);
}

function renderRecs(recommendations) {
  let html = '';
  for (const rec of recommendations) {
    html += `<div class="rec-card">
      <span class="rec-priority priority-${rec.priority}">${rec.priority}</span>
      <div class="rec-content">
        <h4>${rec.title}</h4>
        <p>${rec.description}</p>
        <div class="rec-meta">
          <span>Protocol: <strong>${rec.suggestedProtocol || '--'}</strong></span>
          <span>APY: <span class="yield">${formatAPY(rec.suggestedYield)}</span></span>
          ${rec.tvl ? `<span>TVL: ${formatUSD(rec.tvl)}</span>` : ''}
          ${rec.estimatedAnnualReturn ? `<span>+${formatUSD(rec.estimatedAnnualReturn)}/yr</span>` : ''}
        </div>
      </div>
    </div>`;
  }
  return html;
}

function attachRiskHandlers(container) {
  container.querySelectorAll('.risk-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      container.querySelectorAll('.risk-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const address = document.getElementById('wallet-address').value.trim();
      try {
        const res = await fetch(`${API}/api/wallet/${address}/recommendations?risk=${btn.dataset.risk}`);
        const data = await res.json();
        const recsContainer = document.getElementById('recs-container');
        if (data.data?.recommendations?.recommendations) {
          recsContainer.innerHTML = renderRecs(data.data.recommendations.recommendations);
        }
      } catch (err) {
        console.error('Failed to load recommendations:', err);
      }
    });
  });
}

// ========== COMPARE ==========
document.getElementById('compare-btn').addEventListener('click', compareYields);

async function compareYields() {
  const token = document.getElementById('compare-token').value;
  const loading = document.getElementById('compare-loading');
  const results = document.getElementById('compare-results');
  loading.classList.remove('hidden');
  results.innerHTML = '';

  try {
    const res = await fetch(`${API}/api/search?q=${encodeURIComponent(token)}`);
    const { data } = await res.json();

    const filtered = data
      .filter(p => p.apy && p.apy < 1000 && p.tvlUsd > 100000)
      .sort((a, b) => (b.apy || 0) - (a.apy || 0))
      .slice(0, 15);

    if (!filtered.length) {
      results.innerHTML = '<div class="card"><p class="text-dim">No pools found for this token.</p></div>';
      loading.classList.add('hidden');
      return;
    }

    // Bar chart
    const maxApy = Math.max(...filtered.map(p => p.apy));
    let html = '<div class="card"><div class="card-header"><h3>APY Comparison</h3></div>';
    const chartDiv = document.createElement('div');
    html += '<div id="compare-chart"></div></div>';

    // Ranked list
    html += '<div style="margin-top: 16px">';
    filtered.forEach((p, i) => {
      html += `<div class="compare-card">
        <div style="display:flex;align-items:center">
          <div class="compare-rank">${i + 1}</div>
          <div class="compare-info">
            <h4>${p.symbol}</h4>
            <p>${p.project} &middot; TVL: ${formatUSD(p.tvlUsd)} ${p.stablecoin ? '&middot; Stable' : ''}</p>
          </div>
        </div>
        <div class="compare-apy ${apyClass(p.apy)}">${formatAPY(p.apy)}</div>
      </div>`;
    });
    html += '</div>';

    results.innerHTML = html;

    // Render bar chart
    renderBarChart(
      document.getElementById('compare-chart'),
      filtered.slice(0, 10).map(p => ({
        label: `${p.project}`,
        value: p.apy,
        display: formatAPY(p.apy),
      })),
      maxApy,
      'mixed'
    );
  } catch (err) {
    results.innerHTML = `<div class="card"><p>Comparison failed: ${err.message}</p></div>`;
  }
  loading.classList.add('hidden');
}

// ========== PROTOCOLS ==========
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
        <p>${proto.pools} pools</p>
      </div>
      <div class="protocol-stats">
        <div>
          <div class="protocol-stat-value">${formatUSD(proto.totalTvl)}</div>
          <div class="protocol-stat-label">TVL</div>
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

// ========== INIT ==========
loadDashboard();
