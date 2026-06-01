import React, { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';

const FILTER_OPTIONS = {
  phase: { label: 'Phase', values: ['Early Phase 1', 'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'] },
  sponsor_class: { label: 'Sponsor', values: ['INDUSTRY', 'OTHER', 'NIH', 'NETWORK', 'OTHER_GOV', 'FED'] },
  study_type: { label: 'Study Type', values: ['INTERVENTIONAL', 'OBSERVATIONAL'] },
  status: { label: 'Status', values: ['RECRUITING', 'ACTIVE_NOT_RECRUITING', 'COMPLETED', 'NOT_YET_RECRUITING', 'TERMINATED', 'WITHDRAWN', 'SUSPENDED'] },
  line_of_therapy: { label: 'Line', values: ['Advanced / Metastatic', 'Relapsed / Refractory', 'Treatment Naive / 1st Line', 'Neoadjuvant', 'Adjuvant', 'Maintenance'] },
  is_combination: { label: 'Regimen', values: ['true', 'false'] },
  country: { label: 'Country', values: [] },
  start_year: { label: 'Start Year', values: Array.from({ length: 27 }, (_, i) => 2026 - i).map(String) },
  end_year: { label: 'End Year', values: Array.from({ length: 27 }, (_, i) => 2026 - i).map(String) },
};

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api';

const DISPLAY_LABELS = {
  INDUSTRY: 'Industry', OTHER: 'Academic/Other', NIH: 'NIH', NETWORK: 'Network',
  OTHER_GOV: 'Other Gov', FED: 'Federal', INTERVENTIONAL: 'Interventional',
  OBSERVATIONAL: 'Observational', RECRUITING: 'Recruiting',
  ACTIVE_NOT_RECRUITING: 'Active, not recruiting', COMPLETED: 'Completed',
  NOT_YET_RECRUITING: 'Not yet recruiting', TERMINATED: 'Terminated',
  WITHDRAWN: 'Withdrawn', SUSPENDED: 'Suspended',
  true: 'Combination', false: 'Monotherapy',
};

export default function FilterBar({ filters, setFilters }) {
  const [filterOptions, setFilterOptions] = useState(FILTER_OPTIONS);
  const activeFilters = Object.entries(filters).filter(([, v]) => v);

  useEffect(() => {
    fetch(`${API}/countries`)
      .then(res => res.json())
      .then(data => {
        if (data.countries) {
          setFilterOptions(prev => ({
            ...prev,
            country: { label: 'Country', values: data.countries }
          }));
        }
      })
      .catch(err => console.error(err));
  }, []);

  const handleSelect = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? null : value }));
  };

  const clearAll = () => {
    setFilters(Object.fromEntries(Object.keys(FILTER_OPTIONS).map(k => [k, null])));
  };

  return (
    <section className="mb-6 border border-border bg-surface rounded-xl px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-accent" />
        {Object.entries(filterOptions).map(([key, opt]) => (
          <select
            key={key}
            className="h-10 border border-border bg-background rounded-lg px-3 text-xs font-semibold text-primary outline-none hover:border-accent focus:border-accent shadow-sm"
            value={filters[key] || ''}
            onChange={e => handleSelect(key, e.target.value || null)}
          >
            <option value="">{opt.label}</option>
            {opt.values.map(v => (
              <option key={v} value={v}>{DISPLAY_LABELS[v] || v}</option>
            ))}
          </select>
        ))}
        {activeFilters.length > 0 && (
          <button onClick={clearAll} className="ml-auto text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors">
            Clear filters
          </button>
        )}
      </div>

      {activeFilters.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeFilters.map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center gap-2 border border-accent/25 bg-accent/10 px-2.5 py-1.5 rounded-md text-xs font-semibold text-accent"
            >
              {filterOptions[key]?.label || key}: {DISPLAY_LABELS[value] || value}
              <button onClick={() => handleSelect(key, null)} className="hover:text-rose-500 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
