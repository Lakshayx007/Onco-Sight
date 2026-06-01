import React from 'react';
import { Activity, Beaker, FileText, Target, Calendar } from 'lucide-react';
import { BookOpen } from 'lucide-react';
import GeoMap from './charts/GeoMap';
import FunnelChart from './charts/FunnelChart';
import BarChart from './charts/BarChart';
import SponsorHeatmap from './charts/SponsorHeatmap';
import BiomarkerPhaseHeatmap from './charts/BiomarkerPhaseHeatmap';
import AssetLandscape from './charts/AssetLandscape';
import StatusDonut from './charts/StatusDonut';
import StatusPhaseHeatmap from './charts/StatusPhaseHeatmap';
import TimelineChart from './charts/TimelineChart';
import TopCompetitorsChart from './charts/TopCompetitorsChart';
import CombinationStrategyChart from './charts/CombinationStrategyChart';

export default function ReportView({ 
  cancer, summary, filters, funnelData, statusData,
  geoData, drugsData, sponsorData, biomarkerData, biomarkerPhaseData,
  drugLandscape, statusPhaseData, timelineData, chartInsights, theme
}) {
  if (!summary) return null;

  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const activeFilters = Object.entries(filters || {}).filter(([_, v]) => v).map(([k, v]) => `${k.replace('_', ' ')}: ${v}`);

  return (
    <div className="report-container bg-white text-black min-h-screen p-8 absolute -left-[9999px] top-0 w-[1200px] opacity-0 pointer-events-none -z-50 print:static print:w-auto print:opacity-100 print:pointer-events-auto print:z-50">
      
      {/* Header */}
      <div className="border-b-2 border-slate-800 pb-4 mb-6">
        <h1 className="text-3xl font-extrabold uppercase tracking-widest text-slate-900 mb-2">{cancer} - Pipeline Intelligence Report</h1>
        <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
          <span>Generated on {date}</span>
          <span>Data source: ClinicalTrials.gov (Normalized)</span>
        </div>
      </div>

      {/* Applied Filters Context */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-2 uppercase tracking-wide border-b border-slate-200 pb-1">Applied Filters Context</h2>
        {activeFilters.length > 0 ? (
          <div className="flex flex-wrap gap-2 mt-2">
            {activeFilters.map(f => (
              <span key={f} className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-semibold capitalize">{f}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">No specific filters applied (Global view).</p>
        )}
      </div>

      {/* Executive KPIs */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        <div className="border border-slate-300 p-4 rounded-lg bg-slate-50">
          <div className="text-xs uppercase font-bold text-slate-500 mb-1">Total Trials</div>
          <div className="text-2xl font-black text-slate-900">{summary.total_trials?.toLocaleString() || 0}</div>
        </div>
        <div className="border border-slate-300 p-4 rounded-lg bg-slate-50">
          <div className="text-xs uppercase font-bold text-slate-500 mb-1">Distinct Assets</div>
          <div className="text-2xl font-black text-slate-900">{summary.distinct_drugs?.toLocaleString() || 0}</div>
        </div>
        <div className="border border-slate-300 p-4 rounded-lg bg-slate-50">
          <div className="text-xs uppercase font-bold text-slate-500 mb-1">Target Patients</div>
          <div className="text-2xl font-black text-slate-900">{summary.total_patients?.toLocaleString() || 0}</div>
        </div>
        <div className="border border-slate-300 p-4 rounded-lg bg-slate-50">
          <div className="text-xs uppercase font-bold text-slate-500 mb-1">Countries</div>
          <div className="text-2xl font-black text-slate-900">{summary.countries || 0}</div>
        </div>
      </div>

      {/* Glossary */}
      <div className="mb-10 page-break-inside-avoid">
        <h2 className="text-xl font-bold mb-3 uppercase tracking-wide border-b-2 border-slate-800 pb-1 flex items-center gap-2">
          <BookIcon className="w-5 h-5" /> Glossary of Terms
        </h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm mt-4">
          <div><strong className="text-slate-900">Interventional Trial:</strong> A clinical study in which participants are assigned to receive one or more interventions (or no intervention) so that researchers can evaluate the effects.</div>
          <div><strong className="text-slate-900">Phase 1:</strong> Initial testing in small groups to evaluate safety, determine safe dosage, and identify side effects.</div>
          <div><strong className="text-slate-900">Phase 2:</strong> Testing in larger groups to see if the drug is effective and to further evaluate safety.</div>
          <div><strong className="text-slate-900">Phase 3:</strong> Large-scale testing to confirm effectiveness, monitor side effects, and compare with standard or equivalent treatments.</div>
          <div><strong className="text-slate-900">Terminated:</strong> A study that stopped recruiting or enrolling participants early and will not start again.</div>
          <div><strong className="text-slate-900">Distinct Assets:</strong> The number of unique investigational drugs or therapies, excluding generic terms like "Placebo" or "Surgery".</div>
        </div>
      </div>

      {/* Phase Attrition Summary */}
      <div className="mb-8 page-break-inside-avoid">
        <h2 className="text-xl font-bold mb-3 uppercase tracking-wide border-b-2 border-slate-800 pb-1 flex items-center gap-2">
          <Target className="w-5 h-5" /> Pipeline Attrition Summary
        </h2>
        <p className="text-sm text-slate-700 mb-4">
          This table shows the distribution of interventional trials and unique targeted assets across development phases, highlighting the drop-off rate as therapies progress toward approval.
        </p>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white text-xs uppercase">
              <th className="p-3 border border-slate-800">Phase</th>
              <th className="p-3 border border-slate-800">Trials</th>
              <th className="p-3 border border-slate-800">Target Patients</th>
              <th className="p-3 border border-slate-800">Unique Assets</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {funnelData?.map((row, i) => (
              <tr key={row.phase} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                <td className="p-3 border border-slate-300 font-bold">{row.phase}</td>
                <td className="p-3 border border-slate-300">{row.unique_trials?.toLocaleString() || 0}</td>
                <td className="p-3 border border-slate-300">{row.total_enrollment?.toLocaleString() || 0}</td>
                <td className="p-3 border border-slate-300">
                  {row.distinct_drugs?.toLocaleString() || 0} 
                  {row.attrition_pct != null && (
                    <span className="ml-2 text-xs italic text-slate-500">
                      ({row.attrition_pct > 0 ? '+' : ''}{row.attrition_pct}% vs prior)
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status Summary */}
      <div className="page-break-inside-avoid">
        <h2 className="text-xl font-bold mb-3 uppercase tracking-wide border-b-2 border-slate-800 pb-1 flex items-center gap-2">
          <Activity className="w-5 h-5" /> Trial Operational Status
        </h2>
        <div className="flex flex-wrap gap-4 mt-4">
          {statusData?.map(status => (
            <div key={status.status} className="border border-slate-200 bg-slate-50 px-4 py-3 rounded w-64">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                {status.status.replace(/_/g, ' ')}
              </div>
              <div className="text-xl font-black text-slate-900">{status.count?.toLocaleString() || 0} trials</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Charts Section */}
      <div className="mt-12 border-t-4 border-slate-800 pt-8 page-break-before-always">
        <h2 className="text-2xl font-extrabold mb-8 uppercase tracking-widest text-slate-900 border-b-2 border-slate-200 pb-2">
          Visual Intelligence & AI Insights
        </h2>

        {geoData?.length > 0 && (
          <PrintChart title="Global trial footprint" insightState={chartInsights?.['Global trial footprint']} theme={theme}>
            <GeoMap data={geoData} theme={theme} />
          </PrintChart>
        )}

        {funnelData?.length > 0 && (
          <PrintChart title="Interventional phase funnel" insightState={chartInsights?.['Interventional phase funnel']} theme={theme}>
            <FunnelChart data={funnelData} theme={theme} />
          </PrintChart>
        )}

        {statusData?.length > 0 && (
          <PrintChart title="Trial status composition" insightState={chartInsights?.['Trial status composition']} theme={theme}>
            <StatusDonut data={statusData} theme={theme} />
          </PrintChart>
        )}

        {drugsData?.length > 0 && (
          <PrintChart title="Top investigational assets" insightState={chartInsights?.['Top investigational assets']} theme={theme}>
            <BarChart data={drugsData} theme={theme} />
          </PrintChart>
        )}

        {sponsorData?.length > 0 && (
          <PrintChart title="Sponsor pressure by phase" insightState={chartInsights?.['Sponsor pressure by phase']} theme={theme}>
            <SponsorHeatmap data={sponsorData} theme={theme} />
          </PrintChart>
        )}

        {biomarkerData?.length > 0 && (
          <PrintChart title="Molecular signals to watch" insightState={chartInsights?.['Molecular signals to watch']} theme={theme}>
            <div className="p-6 h-full bg-white overflow-hidden text-sm">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {biomarkerData.slice(0, 14).map(item => (
                  <div key={item.biomarker} className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="font-medium text-slate-700">{item.biomarker}</span>
                    <span className="font-bold text-slate-900">{item.trial_count?.toLocaleString()} trials</span>
                  </div>
                ))}
              </div>
            </div>
          </PrintChart>
        )}

        {biomarkerPhaseData?.length > 0 && (
          <PrintChart title="Biomarker concentration by phase" insightState={chartInsights?.['Biomarker concentration by phase']} theme={theme}>
            <BiomarkerPhaseHeatmap data={biomarkerPhaseData} theme={theme} />
          </PrintChart>
        )}

        {drugLandscape?.length > 0 && (
          <PrintChart title="Asset landscape map" insightState={chartInsights?.['Asset landscape map']} theme={theme}>
            <AssetLandscape data={drugLandscape} theme={theme} />
          </PrintChart>
        )}

        {statusPhaseData?.length > 0 && (
          <PrintChart title="Status x phase risk matrix" insightState={chartInsights?.['Status x phase risk matrix']} theme={theme}>
            <StatusPhaseHeatmap data={statusPhaseData} theme={theme} />
          </PrintChart>
        )}

        {timelineData?.length > 0 && (
          <PrintChart title="Trial activity timeline" insightState={chartInsights?.['Trial activity timeline']} theme={theme}>
            <TimelineChart data={timelineData} theme={theme} />
          </PrintChart>
        )}
      </div>

    </div>
  );
}

function PrintChart({ title, children, insightState, theme }) {
  const bg = theme === 'dark' ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]';
  return (
    <div className="mb-8 break-inside-avoid border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
      <h3 className="text-lg font-bold uppercase tracking-wide text-slate-800 border-b border-slate-200 pb-2 mb-4">{title}</h3>
      <div className={`h-[400px] w-full rounded-lg overflow-hidden border border-slate-200 ${bg}`}>
        {children}
      </div>
      {insightState?.text && (
        <div className="mt-4 bg-slate-50 border border-slate-200 p-4 text-sm text-slate-800 rounded-lg flex gap-3">
          <div className="mt-0.5 text-accent">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
          </div>
          <div>
            <strong className="text-slate-900 block mb-1 uppercase tracking-wider text-[10px] font-bold">AI Strategic Insight</strong>
            <div className="leading-relaxed">{insightState.text}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function BookIcon(props) {
  return <BookOpen {...props} />;
}
