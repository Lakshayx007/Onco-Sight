/**
 * api.js — All fetch calls to the FastAPI backend.
 * Single source of truth for API contract.
 */

const BASE_URL = 'http://localhost:8000';

async function _get(path, params = {}) {
  const url = new URL(BASE_URL + path);
  Object.entries(params).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
  const resp = await fetch(url.toString());
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

async function _post(path, body) {
  const resp = await fetch(BASE_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export const API = {
  health:       ()                         => _get('/api/health'),
  cancers:      ()                         => _get('/api/cancers'),
  summary:      (cancer)                   => _get('/api/summary',       { cancer }),
  funnel:       (cancer, study_type)       => _get('/api/funnel',        { cancer, study_type }),
  drugs:        (cancer, phase, sponsor_class, top_n) =>
                  _get('/api/drugs',       { cancer, phase, sponsor_class, top_n }),
  sponsorPhases:(cancer)                   => _get('/api/sponsor-phases', { cancer }),
  geography:    (cancer, top_n)            => _get('/api/geography',     { cancer, top_n }),
  biomarkers:   (cancer, top_n)            => _get('/api/biomarkers',    { cancer, top_n }),
  status:       (cancer)                   => _get('/api/status',        { cancer }),
  timeline:     (cancer)                   => _get('/api/timeline',      { cancer }),
  insight:      (cancer)                   => _get('/api/insight',       { cancer }),
  chat:         (question, cancer)         => _post('/api/chat',         { question, cancer }),
  articles:     (cancer)                   => _get('/api/articles',      { cancer }),
};
