/**
 * app.js — Main controller.
 * Orchestrates all modules: API calls, chart rendering,
 * KPI animations, funnel building, sidebar updates.
 */

import { API }         from './api.js';
import { renderDrugChart, renderSponsorChart, renderGeoChart,
         renderBiomarkerChart, renderStatusChart, renderTimelineChart,
         PHASE_COLORS } from './charts.js';
import { initChatbot } from './chatbot.js';
import { getFilters, setFilter, setCancer, clearFilter, onFilterChange } from './filters.js';

// ── State ──────────────────────────────────────────────────────────────────
let currentCancer = '';
let currentDrugs  = [];
let funnelAnimated = false;

// ── Boot ────────────────────────────────────────────────────────────────────

async function boot() {
  try {
    // 1. Verify backend is up
    await API.health();
  } catch {
    showBanner('⚠ Backend is not running. Start it with: uvicorn main:app --reload --port 8000 (from the backend/ folder)');
    return;
  }

  // 2. Populate cancer dropdown
  try {
    const { cancers } = await API.cancers();
    const sel = document.getElementById('cancerSelect');
    cancers.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      sel.appendChild(opt);
    });

    // Default to Breast Cancer if present, else first
    const defaultCancer = cancers.includes('Breast Cancer') ? 'Breast Cancer' : cancers[0];
    sel.value = defaultCancer;
    await loadCancer(defaultCancer);
  } catch (err) {
    showBanner('Failed to load cancer list: ' + err.message);
  }

  // 3. Wire cancer selector
  document.getElementById('cancerSelect').addEventListener('change', async e => {
    await loadCancer(e.target.value);
  });

  // 4. Wire tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + tab)?.classList.add('active');
      // render chart for newly activated tab
      const f = getFilters();
      switch (tab) {
        case 'geo':        loadGeo(f.cancer);         break;
        case 'biomarkers': loadBiomarkers(f.cancer);  break;
        case 'status':     loadStatus(f.cancer);      break;
        case 'timeline':   loadTimeline(f.cancer);    break;
      }
    });
  });

  // 5. Filter change subscription
  onFilterChange(async filters => {
    await refreshDrugTable(filters);
  });

  // 6. Init chatbot
  initChatbot(() => currentCancer);

  // 7. Scroll reveal
  initScrollReveal();

  // 8. Sidebar reveal
  setTimeout(() => document.querySelector('.intel-sidebar')?.classList.add('visible'), 400);

  // 9. Last updated
  document.getElementById('lastUpdated').textContent = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

// ── Cancer load ──────────────────────────────────────────────────────────────

async function loadCancer(cancer) {
  currentCancer = cancer;
  funnelAnimated = false;
  setCancer(cancer);

  showLoading(true);

  // Fetch all data concurrently
  const [summaryData, funnelData, drugsData, sponsorData, insightData, articlesData] =
    await Promise.allSettled([
      API.summary(cancer),
      API.funnel(cancer, 'INTERVENTIONAL'),
      API.drugs(cancer, null, null, 15),
      API.sponsorPhases(cancer),
      API.insight(cancer),
      API.articles(cancer),
    ]);

  // KPI cards
  if (summaryData.status === 'fulfilled') {
    renderKPIs(summaryData.value);
  }

  // Phase funnel
  if (funnelData.status === 'fulfilled') {
    renderFunnel(funnelData.value.funnel);
  }

  // Drug table + chart
  if (drugsData.status === 'fulfilled') {
    currentDrugs = drugsData.value.drugs;
    renderDrugTable(currentDrugs);
    renderDrugChart('drugChart', currentDrugs, handleDrugClick);
  }

  // Sponsor chart
  if (sponsorData.status === 'fulfilled') {
    renderSponsorChart('sponsorChart', sponsorData.value.data);
  }

  // AI Insight
  renderInsight(insightData.status === 'fulfilled' ? insightData.value.insight : null);

  // Articles
  renderArticles(articlesData.status === 'fulfilled' ? articlesData.value.articles : []);

  // Re-render active tab
  const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
  if (activeTab) {
    switch (activeTab) {
      case 'geo':        loadGeo(cancer);        break;
      case 'biomarkers': loadBiomarkers(cancer); break;
      case 'status':     loadStatus(cancer);     break;
      case 'timeline':   loadTimeline(cancer);   break;
    }
  }

  showLoading(false);
}

// ── KPI cards ────────────────────────────────────────────────────────────────

function renderKPIs(data) {
  animateCount('kpiTotal',        data.total_trials);
  animateCount('kpiInter',        data.interventional_trials);
  animateCount('kpiDrugs',        data.distinct_drugs);
  animateCount('kpiPatients',     data.total_patients);
  animateCount('kpiCountries',    data.countries);
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;

  const duration = 1400;
  const start    = performance.now();
  const from     = 0;

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const value = Math.round(from + (target - from) * eased);
    el.textContent = value.toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── Phase Funnel (custom HTML/CSS) ──────────────────────────────────────────

function renderFunnel(funnelData) {
  const wrap = document.getElementById('funnelViz');
  if (!wrap) return;
  wrap.innerHTML = '';

  const maxTrials = Math.max(...funnelData.map(d => d.unique_trials), 1);
  const MIN_W = 45;  // percent minimum width for smallest bar

  funnelData.forEach((d, i) => {
    if (d.unique_trials === 0) return;

    const widthPct = MIN_W + ((d.unique_trials / maxTrials) * (100 - MIN_W));

    const row = document.createElement('div');
    row.className = 'funnel-phase-row';

    // Attrition connector (between phases)
    if (i > 0 && d.attrition_pct != null) {
      const atr = document.createElement('div');
      atr.className = 'funnel-attrition';
      atr.innerHTML = `
        <span class="funnel-attrition-arrow">↓</span>
        <span class="funnel-attrition-pct">${d.attrition_pct}%</span>
        <span>drug attrition</span>`;
      wrap.appendChild(atr);
    } else if (i > 0) {
      const spacer = document.createElement('div');
      spacer.style.height = '4px';
      wrap.appendChild(spacer);
    }

    const bar = document.createElement('div');
    bar.className = 'funnel-bar';
    bar.style.cssText = `
      width: ${widthPct}%;
      background: linear-gradient(135deg, ${d.color}cc, ${d.color}88);
      border: 1px solid ${d.color}55;
      animation-delay: ${i * 0.12}s;
    `;
    bar.dataset.phase = d.phase;

    bar.innerHTML = `
      <div class="funnel-bar-left">
        <span class="funnel-phase-name">${d.phase}</span>
        <span class="funnel-phase-sub">${d.distinct_drugs.toLocaleString()} drug assets</span>
      </div>
      <div class="funnel-bar-right">
        <span class="funnel-trial-count">${d.unique_trials.toLocaleString()}</span>
        <span class="funnel-drug-count">trials</span>
      </div>`;

    bar.addEventListener('click', () => {
      const selected = bar.dataset.phase;
      const current  = getFilters().phase;
      setFilter('phase', current === selected ? null : selected);
      document.querySelectorAll('.funnel-bar').forEach(b =>
        b.classList.toggle('selected', b.dataset.phase === selected && current !== selected));
    });

    row.appendChild(bar);
    wrap.appendChild(row);
  });

  // Metrics table below the funnel
  const table = document.createElement('table');
  table.className = 'funnel-metrics-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Phase</th>
        <th>Trials</th>
        <th>Drug Assets</th>
        <th>Target Patients</th>
      </tr>
    </thead>
    <tbody>
      ${funnelData.filter(d => d.unique_trials > 0).map(d => `
        <tr>
          <td>
            <span class="phase-dot-inline" style="background:${d.color}"></span>
            ${d.phase}
          </td>
          <td>${d.unique_trials.toLocaleString()}</td>
          <td>${d.distinct_drugs.toLocaleString()}</td>
          <td>${d.total_enrollment.toLocaleString()}</td>
        </tr>
      `).join('')}
    </tbody>`;
  wrap.appendChild(table);

  // Trigger grow animation after paint
  requestAnimationFrame(() => {
    wrap.querySelectorAll('.funnel-bar').forEach((bar, i) => {
      setTimeout(() => bar.classList.add('animate-grow'), i * 120);
    });
  });
}

// ── Drug table ────────────────────────────────────────────────────────────────

function renderDrugTable(drugs) {
  const tbody = document.getElementById('drugTableBody');
  if (!tbody) return;

  if (!drugs || drugs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-text">No drugs found for current filters.</div></div></td></tr>`;
    return;
  }

  tbody.innerHTML = drugs.map((d, i) => `
    <tr data-drug="${d.drug_name}" data-index="${i}">
      <td class="drug-name-cell">${d.drug_name}</td>
      <td class="drug-count-cell">${d.trial_count.toLocaleString()}</td>
      <td>
        <span class="phase-badge" style="background:${PHASE_COLORS[d.dominant_phase] || '#3B82F6'}">
          ${d.dominant_phase}
        </span>
      </td>
      <td class="drug-enrollment-cell">${d.total_enrollment.toLocaleString()}</td>
      <td>${d.sponsor_classes.includes('INDUSTRY') ? 
           '<span style="color:var(--teal);font-size:11px;font-weight:600">Industry</span>' :
           '<span style="color:var(--violet);font-size:11px">Academic</span>'}</td>
    </tr>
  `).join('');

  tbody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', () => handleDrugClick(row.dataset.drug));
  });
}

function handleDrugClick(drugName) {
  const current = getFilters().drug;
  const next    = current === drugName ? null : drugName;
  setFilter('drug', next);

  // Visual selection in table
  document.querySelectorAll('#drugTableBody tr').forEach(row => {
    row.classList.toggle('selected', row.dataset.drug === drugName && current !== drugName);
  });
}

async function refreshDrugTable(filters) {
  const { cancer, phase, sponsorClass } = filters;
  if (!cancer) return;

  const el = document.getElementById('drugChart');
  if (el) el.classList.add('refreshing');

  try {
    const { drugs } = await API.drugs(cancer, phase, sponsorClass, 15);
    currentDrugs = drugs;
    renderDrugTable(drugs);
    renderDrugChart('drugChart', drugs, handleDrugClick);
  } finally {
    if (el) el.classList.remove('refreshing');
  }
}

// ── Drug phase filter pills ───────────────────────────────────────────────────

document.querySelectorAll('.drug-filter-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    const phase = pill.dataset.phase || null;
    document.querySelectorAll('.drug-filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    setFilter('phase', phase);
  });
});

// ── Lazy-loaded tab charts ────────────────────────────────────────────────────

async function loadGeo(cancer) {
  try {
    const { data } = await API.geography(cancer, 40);
    renderGeoChart('geoChart', data);
  } catch { /* noop */ }
}

async function loadBiomarkers(cancer) {
  try {
    const { data } = await API.biomarkers(cancer);
    renderBiomarkerChart('biomarkerChart', data);
  } catch { /* noop */ }
}

async function loadStatus(cancer) {
  try {
    const { data } = await API.status(cancer);
    renderStatusChart('statusChart', data);
  } catch { /* noop */ }
}

async function loadTimeline(cancer) {
  try {
    const { data } = await API.timeline(cancer);
    renderTimelineChart('timelineChart', data);
  } catch { /* noop */ }
}

// ── AI Insight (typing-reveal animation) ────────────────────────────────────

function renderInsight(text) {
  const body = document.getElementById('insightBody');
  if (!body) return;

  if (!text) {
    body.innerHTML = '<div class="insight-loading"><div class="insight-dot"></div><div class="insight-dot"></div><div class="insight-dot"></div></div>';
    return;
  }

  // Typing-reveal: show characters progressively
  body.innerHTML = '<span class="insight-text"></span><span class="insight-cursor"></span>';
  const textEl = body.querySelector('.insight-text');
  const cursor = body.querySelector('.insight-cursor');

  let i = 0;
  const delay = 18; // ms per character
  function reveal() {
    if (i < text.length) {
      textEl.textContent += text[i];
      i++;
      setTimeout(reveal, delay);
    } else {
      // Hide cursor after done
      setTimeout(() => { if (cursor) cursor.style.display = 'none'; }, 1000);
    }
  }
  reveal();
}

// ── Articles ────────────────────────────────────────────────────────────────

function renderArticles(articles) {
  const container = document.getElementById('articlesList');
  if (!container) return;

  if (!articles || articles.length === 0) {
    container.innerHTML = `<div class="article-item"><span style="color:var(--text-2);font-size:12px;">No recent articles found. Check PubMed connectivity.</span></div>`;
    return;
  }

  container.innerHTML = articles.map(a => `
    <div class="article-item">
      <div class="article-title">
        <a href="${a.url}" target="_blank" rel="noopener">${a.title}</a>
      </div>
      <div class="article-meta">
        <span class="article-source">${a.source}</span>
        ${a.date ? `<span>${a.date}</span>` : ''}
      </div>
    </div>
  `).join('');
}

// ── Scroll reveal (IntersectionObserver) ─────────────────────────────────────

function initScrollReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

// ── Loading bar ───────────────────────────────────────────────────────────────

function showLoading(on) {
  const bar = document.getElementById('loadingBar');
  if (!bar) return;
  if (on) {
    bar.style.transform = 'scaleX(0)';
    bar.classList.add('active');
    requestAnimationFrame(() => { bar.style.transform = 'scaleX(0.9)'; });
  } else {
    bar.style.transform = 'scaleX(1)';
    setTimeout(() => { bar.classList.remove('active'); bar.style.transform = 'scaleX(0)'; }, 300);
  }
}

// ── Banner ────────────────────────────────────────────────────────────────────

function showBanner(msg) {
  const el = document.getElementById('errorBanner');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

// ── Start ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', boot);
