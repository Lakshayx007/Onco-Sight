/**
 * charts.js — All Plotly.js chart builders.
 * Dark-themed, consistent with design tokens.
 * Every chart returns a rendered Plotly figure.
 */

const PHASE_COLORS = {
  'Early Phase 1': '#4ECDC4',
  'Phase 1':       '#00D4AA',
  'Phase 2':       '#3B82F6',
  'Phase 3':       '#8B5CF6',
  'Phase 4':       '#F59E0B',
};

// Base Plotly layout shared by all charts
const BASE_LAYOUT = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor:  'rgba(0,0,0,0)',
  font: { family: 'Space Grotesk, system-ui, sans-serif', color: '#94A3B8', size: 11 },
  margin: { l: 10, r: 10, t: 36, b: 10 },
  legend: { bgcolor: 'rgba(0,0,0,0)', font: { color: '#94A3B8', size: 11 } },
  xaxis: {
    gridcolor: 'rgba(255,255,255,0.04)',
    linecolor: 'rgba(255,255,255,0.08)',
    tickfont:  { color: '#94A3B8', size: 10 },
    zerolinecolor: 'rgba(255,255,255,0.08)',
  },
  yaxis: {
    gridcolor: 'rgba(255,255,255,0.04)',
    linecolor: 'rgba(255,255,255,0.08)',
    tickfont:  { color: '#94A3B8', size: 10 },
    zerolinecolor: 'rgba(255,255,255,0.08)',
  },
};

const PLOTLY_CONFIG = {
  displayModeBar: false,
  responsive:     true,
  doubleClick:    false,
};

function layout(overrides) {
  return Object.assign({}, BASE_LAYOUT, overrides);
}

// ── Drug horizontal bar chart ──────────────────────────────────────────────

export function renderDrugChart(containerId, drugs, onDrugClick) {
  if (!drugs || drugs.length === 0) {
    document.getElementById(containerId).innerHTML =
      '<div class="chart-placeholder">No drug data for current filters.</div>';
    return;
  }

  const names  = drugs.map(d => d.drug_name);
  const counts = drugs.map(d => d.trial_count);
  const colors = drugs.map(d => PHASE_COLORS[d.dominant_phase] || '#3B82F6');
  const texts  = drugs.map(d =>
    `<b>${d.drug_name}</b><br>Trials: ${d.trial_count.toLocaleString()}<br>` +
    `Phase: ${d.dominant_phase}<br>Patients: ${d.total_enrollment.toLocaleString()}`
  );

  const trace = {
    type:        'bar',
    orientation: 'h',
    x:     counts,
    y:     names,
    marker: { color: colors, opacity: 0.85 },
    hovertemplate: '%{customdata}<extra></extra>',
    customdata: texts,
  };

  const fig = {
    data:   [trace],
    layout: layout({
      title:  { text: 'Top Drug Assets by Trial Count', font: { color: '#F1F5F9', size: 13 }, x: 0.01 },
      height: 340,
      margin: { l: 130, r: 50, t: 40, b: 30 },
      yaxis:  { autorange: 'reversed', tickfont: { size: 11, color: '#F1F5F9' } },
      xaxis:  { title: { text: 'Number of Trials', font: { size: 10 } } },
      bargap: 0.35,
    }),
  };

  Plotly.react(containerId, fig.data, fig.layout, PLOTLY_CONFIG);

  if (onDrugClick) {
    document.getElementById(containerId).on('plotly_click', data => {
      const drug = drugs[data.points[0].pointIndex];
      onDrugClick(drug.drug_name);
    });
  }
}

// ── Sponsor stacked bar (per phase) ───────────────────────────────────────

export function renderSponsorChart(containerId, data) {
  if (!data || data.length === 0) {
    document.getElementById(containerId).innerHTML =
      '<div class="chart-placeholder">No sponsor data available.</div>';
    return;
  }

  const phases    = data.map(d => d.phase);
  const industryV = data.map(d => d['Industry'] || 0);
  const govV      = data.map(d => (d['NIH / Federal'] || 0) + (d['Other Gov'] || 0) + (d['Federal'] || 0));
  const otherV    = data.map(d => d['Other / Academic'] || 0);

  const traces = [
    { name: 'Industry',   y: phases, x: industryV, marker: { color: '#00D4AA' }, type: 'bar', orientation: 'h' },
    { name: 'Gov / NIH',  y: phases, x: govV,       marker: { color: '#3B82F6' }, type: 'bar', orientation: 'h' },
    { name: 'Academic',   y: phases, x: otherV,     marker: { color: '#8B5CF6' }, type: 'bar', orientation: 'h' },
  ];

  const fig = {
    data:   traces,
    layout: layout({
      title:    { text: 'Sponsor Landscape by Phase', font: { color: '#F1F5F9', size: 13 }, x: 0.01 },
      height:   340,
      barmode:  'stack',
      margin:   { l: 90, r: 20, t: 40, b: 30 },
      yaxis:    { autorange: 'reversed', tickfont: { size: 11, color: '#F1F5F9' } },
      xaxis:    { title: { text: 'Trial Count', font: { size: 10 } } },
      legend:   { orientation: 'h', y: -0.12, x: 0, font: { size: 10 } },
    }),
  };

  Plotly.react(containerId, fig.data, fig.layout, PLOTLY_CONFIG);
}

// ── Geography choropleth ───────────────────────────────────────────────────

export function renderGeoChart(containerId, geoData) {
  if (!geoData || geoData.length === 0) {
    document.getElementById(containerId).innerHTML =
      '<div class="chart-placeholder">No geography data available.</div>';
    return;
  }

  const trace = {
    type:         'choropleth',
    locationmode: 'country names',
    locations:    geoData.map(d => d.country),
    z:            geoData.map(d => d.trial_count),
    colorscale:   [[0, '#152444'], [0.5, '#3B82F6'], [1, '#00D4AA']],
    colorbar: {
      title: { text: 'Trials', font: { color: '#94A3B8', size: 10 } },
      tickfont: { color: '#94A3B8', size: 10 },
      len: 0.6,
    },
    hovertemplate: '<b>%{location}</b><br>Trials: %{z:,}<extra></extra>',
    marker:        { line: { color: 'rgba(255,255,255,0.1)', width: 0.5 } },
  };

  const fig = {
    data:   [trace],
    layout: layout({
      title:  { text: 'Global Trial Distribution', font: { color: '#F1F5F9', size: 13 }, x: 0.01 },
      height: 350,
      margin: { l: 0, r: 0, t: 40, b: 0 },
      geo: {
        bgcolor:         'rgba(0,0,0,0)',
        showframe:       false,
        showcoastlines:  true,
        coastlinecolor:  'rgba(255,255,255,0.1)',
        showland:        true,
        landcolor:       '#0F1F3D',
        showocean:       true,
        oceancolor:      '#0B1628',
        showlakes:       false,
        projection:      { type: 'natural earth' },
      },
    }),
  };

  Plotly.react(containerId, fig.data, fig.layout, PLOTLY_CONFIG);
}

// ── Biomarker horizontal bar ───────────────────────────────────────────────

export function renderBiomarkerChart(containerId, data) {
  if (!data || data.length === 0) {
    document.getElementById(containerId).innerHTML =
      '<div class="chart-placeholder">No biomarker data extracted for this cancer.</div>';
    return;
  }

  const trace = {
    type:        'bar',
    orientation: 'h',
    x:    data.map(d => d.trial_count),
    y:    data.map(d => d.biomarker),
    marker: {
      color: data.map((_, i) => `rgba(0, 212, 170, ${0.9 - i * 0.05})`),
    },
    hovertemplate: '<b>%{y}</b><br>Trials: %{x:,}<extra></extra>',
  };

  const fig = {
    data:   [trace],
    layout: layout({
      title:  { text: 'Biomarker & Mutation Landscape', font: { color: '#F1F5F9', size: 13 }, x: 0.01 },
      height: 320,
      margin: { l: 140, r: 30, t: 40, b: 30 },
      yaxis:  { autorange: 'reversed', tickfont: { size: 11, color: '#F1F5F9' } },
      xaxis:  { title: { text: 'Trial Count', font: { size: 10 } } },
    }),
  };

  Plotly.react(containerId, fig.data, fig.layout, PLOTLY_CONFIG);
}

// ── Status donut ───────────────────────────────────────────────────────────

export function renderStatusChart(containerId, data) {
  if (!data || data.length === 0) {
    document.getElementById(containerId).innerHTML =
      '<div class="chart-placeholder">No status data available.</div>';
    return;
  }

  const STATUS_LABELS = {
    RECRUITING:             'Recruiting',
    ACTIVE_NOT_RECRUITING:  'Active (Not Recruiting)',
    COMPLETED:              'Completed',
    NOT_YET_RECRUITING:     'Not Yet Recruiting',
    TERMINATED:             'Terminated',
    WITHDRAWN:              'Withdrawn',
    SUSPENDED:              'Suspended',
    ENROLLING_BY_INVITATION:'By Invitation',
    UNKNOWN:                'Unknown',
  };

  const top = data.slice(0, 7);
  const trace = {
    type:      'pie',
    hole:      0.55,
    values:    top.map(d => d.count),
    labels:    top.map(d => STATUS_LABELS[d.status] || d.status),
    marker:    { colors: top.map(d => d.color), line: { color: '#0B1628', width: 2 } },
    textinfo:  'percent',
    textfont:  { color: '#F1F5F9', size: 10 },
    hovertemplate: '<b>%{label}</b><br>%{value:,} trials (%{percent})<extra></extra>',
    direction: 'clockwise',
  };

  const fig = {
    data:   [trace],
    layout: layout({
      title:       { text: 'Trial Status Distribution', font: { color: '#F1F5F9', size: 13 }, x: 0.01 },
      height:      320,
      showlegend:  true,
      legend:      { orientation: 'v', x: 1.02, y: 0.5, font: { size: 10, color: '#94A3B8' } },
      margin:      { l: 10, r: 120, t: 40, b: 10 },
      annotations: [{
        text:  `${data.reduce((s,d)=>s+d.count,0).toLocaleString()}<br><span style="font-size:10px">trials</span>`,
        x: 0.5, y: 0.5, showarrow: false,
        font: { size: 16, color: '#F1F5F9', family: 'JetBrains Mono' },
        xanchor: 'center', yanchor: 'middle',
      }],
    }),
  };

  Plotly.react(containerId, fig.data, fig.layout, PLOTLY_CONFIG);
}

// ── Timeline stacked area ──────────────────────────────────────────────────

export function renderTimelineChart(containerId, data) {
  if (!data || data.length === 0) {
    document.getElementById(containerId).innerHTML =
      '<div class="chart-placeholder">No timeline data available.</div>';
    return;
  }

  const phases = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'];
  const years  = data.map(d => d.year);

  const traces = phases.map(phase => ({
    name:      phase,
    type:      'scatter',
    mode:      'lines',
    fill:      'tonexty',
    x:         years,
    y:         data.map(d => d[phase] || 0),
    line:      { color: PHASE_COLORS[phase], width: 1.5 },
    fillcolor: PHASE_COLORS[phase].replace(')', ', 0.15)').replace('rgb', 'rgba').replace('#', ''),
    hovertemplate: `<b>${phase}</b><br>Year: %{x}<br>Trials: %{y:,}<extra></extra>`,
  }));

  // Fix fill colors using hex-to-rgba conversion
  traces.forEach(t => { t.fillcolor = hexToRgba(PHASE_COLORS[t.name], 0.15); });

  const fig = {
    data:   traces,
    layout: layout({
      title:  { text: 'New Trials by Year & Phase', font: { color: '#F1F5F9', size: 13 }, x: 0.01 },
      height: 320,
      margin: { l: 50, r: 20, t: 40, b: 40 },
      xaxis:  { title: { text: 'Year', font: { size: 10 } }, dtick: 5 },
      yaxis:  { title: { text: 'New Trials', font: { size: 10 } } },
      legend: { orientation: 'h', y: -0.15, font: { size: 10 } },
      hovermode: 'x unified',
    }),
  };

  Plotly.react(containerId, fig.data, fig.layout, PLOTLY_CONFIG);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export { PHASE_COLORS };
