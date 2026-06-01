/**
 * filters.js — Filter state management.
 * Tracks active filters (phase, sponsor class, drug)
 * and notifies subscribers when they change.
 */

const state = {
  cancer:       '',
  phase:        null,   // "Phase 1" | "Phase 2" | etc.
  sponsorClass: null,   // "INDUSTRY" | "NIH" | etc.
  drug:         null,   // drug name string
};

const subscribers = [];

export function getFilters() { return { ...state }; }

export function setFilter(key, value) {
  if (state[key] === value) return; // no change
  state[key] = value;
  _renderChips();
  subscribers.forEach(fn => fn({ ...state }));
}

export function setCancer(cancer) {
  state.cancer       = cancer;
  state.phase        = null;
  state.sponsorClass = null;
  state.drug         = null;
  _renderChips();
  subscribers.forEach(fn => fn({ ...state }));
}

export function clearFilter(key) {
  state[key] = null;
  _renderChips();
  subscribers.forEach(fn => fn({ ...state }));
}

export function onFilterChange(fn) {
  subscribers.push(fn);
}

function _renderChips() {
  const container = document.getElementById('activeFilters');
  if (!container) return;

  const chips = [];

  if (state.phase) {
    chips.push({ key: 'phase', label: `Phase: ${state.phase}` });
  }
  if (state.sponsorClass) {
    const labels = { INDUSTRY: 'Industry', NIH: 'NIH / Fed' };
    chips.push({ key: 'sponsorClass', label: `Sponsor: ${labels[state.sponsorClass] || state.sponsorClass}` });
  }
  if (state.drug) {
    chips.push({ key: 'drug', label: `Drug: ${state.drug}` });
  }

  if (chips.length === 0) {
    container.innerHTML = '<span class="filter-empty-text">No active filters</span>';
    return;
  }

  container.innerHTML = chips.map(c => `
    <span class="filter-chip">
      ${c.label}
      <button class="filter-chip-remove" data-key="${c.key}" title="Remove filter">×</button>
    </span>
  `).join('');

  container.querySelectorAll('.filter-chip-remove').forEach(btn => {
    btn.addEventListener('click', () => clearFilter(btn.dataset.key));
  });
}
