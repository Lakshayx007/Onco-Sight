import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Chatbot from '../components/Chatbot';
import ReportView from '../components/ReportView';
import FilterBar from '../components/FilterBar';
import ChartModal from '../components/ChartModal';
import GeoMap from '../components/charts/GeoMap';
import FunnelChart from '../components/charts/FunnelChart';
import BarChart from '../components/charts/BarChart';
import SponsorHeatmap from '../components/charts/SponsorHeatmap';
import BiomarkerPhaseHeatmap from '../components/charts/BiomarkerPhaseHeatmap';
import AssetLandscape from '../components/charts/AssetLandscape';
import StatusDonut from '../components/charts/StatusDonut';
import StatusPhaseHeatmap from '../components/charts/StatusPhaseHeatmap';
import TimelineChart from '../components/charts/TimelineChart';
import ChartInsight from '../components/ChartInsight';
import TopCompetitorsChart from '../components/charts/TopCompetitorsChart';
import CombinationStrategyChart from '../components/charts/CombinationStrategyChart';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import { Activity, BookOpen, ExternalLink, FlaskConical, Globe, Network, Sparkles, TrendingUp, Users, Moon, Sun, Menu, MessageSquare, Maximize2, Target, Eye } from 'lucide-react';

import * as echarts from 'echarts';

const vintageColors = ['#d87c7c', '#919e8b', '#d7ab82', '#6e7074', '#61a0a8', '#efa18d', '#787464', '#cc7e63', '#724e58', '#4b565b'];
echarts.registerTheme('vintage', {
    color: vintageColors,
    backgroundColor: 'transparent',
    graph: { color: vintageColors }
});

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api';

const fmt = (value) => value == null ? '-' : Number(value).toLocaleString();

function Panel({ title, subtitle, children, className = '', height = 'h-[420px]', onZoom, chartData, chartInsights, onGenerateInsight, headerAction, loading = false }) {
  const insightState = chartInsights?.[title];
  const minHeightClass = height.replace('h-', 'min-h-');
  return (
    <section className={`group relative bg-surface rounded-2xl border border-border shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col p-5 ${minHeightClass} h-full ${className}`}>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/[0.03] to-transparent pointer-events-none" />
      <div className="mb-3 flex items-start justify-between gap-4 relative z-10">
        <div>
          <h3 className="text-sm font-bold text-primary tracking-tight">{title}</h3>
          {subtitle && <p className="mt-1 text-[10px] leading-5 text-muted">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {headerAction}
          {onZoom && (
            <button onClick={onZoom} className="p-1.5 rounded-lg hover:bg-accent/10 text-muted hover:text-accent transition-all opacity-0 group-hover:opacity-100">
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-[280px] relative z-10 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin"></div>
          </div>
        ) : (
          children
        )}
      </div>
      {chartData && !loading && (
        <div className="mt-2 border-t border-border/50 pt-3 shrink-0 relative z-10">
          <ChartInsight 
            insight={insightState?.text} 
            loading={insightState?.loading} 
            onGenerate={() => onGenerateInsight && onGenerateInsight(title, chartData)} 
          />
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, icon: Icon, note }) {
  return (
    <div className="group relative bg-surface p-5 rounded-2xl border border-border shadow-sm hover:shadow-lg hover:border-accent/30 transition-all duration-300 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="mb-4 flex items-center justify-between relative z-10">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</span>
        <div className="h-8 w-8 rounded-lg bg-accent/10 grid place-items-center">
          <Icon className="h-4 w-4 text-accent" />
        </div>
      </div>
      <div className="text-2xl font-extrabold tabular-nums text-primary relative z-10">{fmt(value)}</div>
      {note && <div className="mt-1 text-[10px] text-muted relative z-10">{note}</div>}
    </div>
  );
}

const globalInsightCache = {};

export default function Dashboard() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const urlCancer = urlParams.get('cancer');

  const [cancerHierarchy, setCancerHierarchy] = useState({});
  const [parentCancer, setParentCancer] = useState(() => urlCancer || localStorage.getItem('parentCancer') || 'Breast Cancer');
  const [selectedSubtypes, setSelectedSubtypes] = useState(() => {
    if (urlCancer) return [urlCancer];
    const saved = localStorage.getItem('selectedSubtypes');
    return saved ? JSON.parse(saved) : [localStorage.getItem('parentCancer') || 'Breast Cancer'];
  });

  useEffect(() => {
    localStorage.setItem('parentCancer', parentCancer);
  }, [parentCancer]);

  useEffect(() => {
    localStorage.setItem('selectedSubtypes', JSON.stringify(selectedSubtypes));
  }, [selectedSubtypes]);
  
  const activeCancerQuery = useMemo(() => {
    const allOptions = cancerHierarchy[parentCancer]?.subtypes?.map(s => s.condition) || [];
    if (selectedSubtypes.length === 0 || selectedSubtypes.includes(parentCancer) || (allOptions.length > 0 && selectedSubtypes.length === allOptions.length)) {
      return parentCancer;
    }
    return selectedSubtypes.join(',');
  }, [parentCancer, selectedSubtypes, cancerHierarchy]);
  const [activePhaseFilter, setActivePhaseFilter] = useState(null);
  const [theme, setTheme] = useState('vintage');
  const [filters, setFilters] = useState({
    phase: null, sponsor_class: null, study_type: null,
    status: null, line_of_therapy: null, is_combination: null,
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? saved === 'true' : false;
  });
  
  useEffect(() => {
    localStorage.setItem('sidebarOpen', isSidebarOpen);
  }, [isSidebarOpen]);

  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [zoomedChart, setZoomedChart] = useState(null);

  const [chatMessages, setChatMessages] = useState([]);
  const [chatIsLoading, setChatIsLoading] = useState(false);

  const [summary, setSummary] = useState(null);
  const [geoData, setGeoData] = useState([]);
  const [funnelData, setFunnelData] = useState([]);
  const [drugsData, setDrugsData] = useState([]);
  const [sponsorData, setSponsorData] = useState([]);
  const [biomarkerData, setBiomarkerData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [insight, setInsight] = useState('');
  const [articles, setArticles] = useState([]);
  const [biomarkerPhaseData, setBiomarkerPhaseData] = useState([]);
  const [drugLandscape, setDrugLandscape] = useState([]);
  const [statusPhaseData, setStatusPhaseData] = useState([]);
  const [topSponsorsDetailed, setTopSponsorsDetailed] = useState([]);
  const [combinationStrategy, setCombinationStrategy] = useState(null);
  const [selectedCombinationDrug, setSelectedCombinationDrug] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [comboLoading, setComboLoading] = useState(true);
  const [chartInsights, setChartInsights] = useState({});
  const [articleQuery, setArticleQuery] = useState('');
  const [articlesLoading, setArticlesLoading] = useState(false);

  const handleFetchInsight = async (chartName, data) => {
    if (!data || Object.keys(data).length === 0 || (Array.isArray(data) && data.length === 0)) return;
    setChartInsights(prev => ({ ...prev, [chartName]: { loading: true } }));
    try {
      const res = await axios.post(`${API}/chart-insight`, { cancer: activeCancerQuery, chart_name: chartName, data });
      setChartInsights(prev => ({ ...prev, [chartName]: { text: res.data.insight, loading: false } }));
    } catch {
      setChartInsights(prev => ({ ...prev, [chartName]: { text: 'Failed to load AI insight.', loading: false } }));
    }
  };

  useEffect(() => {
    axios.get(`${API}/hierarchy`).then(res => {
      setCancerHierarchy(res.data || {});
    }).catch(() => {});
  }, []);

  const parentCancers = useMemo(() => {
    const list = Object.keys(cancerHierarchy);
    if (!list.includes('All Cancers') && list.length > 0) return ['All Cancers', ...list];
    return list;
  }, [cancerHierarchy]);

  const currentSubtypes = useMemo(() => {
    return cancerHierarchy[parentCancer]?.subtypes?.map(s => s.condition) || [];
  }, [cancerHierarchy, parentCancer]);

  const handleParentCancerChange = (e) => {
    const newParent = e.target.value;
    setParentCancer(newParent);
    setSelectedSubtypes([newParent]);
  };

  useEffect(() => {
    setChatMessages([
      { role: 'assistant', content: `Ask a pipeline question about ${activeCancerQuery}. I will answer using the current dashboard context and Groq.` }
    ]);
  }, [activeCancerQuery]);

  const buildQS = useCallback((extra = {}) => {
    const params = new URLSearchParams({ cancer: activeCancerQuery, ...extra });
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    return params.toString();
  }, [activeCancerQuery, filters]);

  useEffect(() => {
    setDataLoading(true);
    const qs = buildQS();
    Promise.all([
      axios.get(`${API}/summary?${qs}`).then(r => setSummary(r.data)).catch(() => {}),
      axios.get(`${API}/geography?${buildQS({ top_n: 50 })}`).then(r => setGeoData(r.data.data || [])).catch(() => {}),
      axios.get(`${API}/funnel?${buildQS({ study_type: 'INTERVENTIONAL' })}`).then(r => setFunnelData(r.data.funnel || [])).catch(() => {}),
      axios.get(`${API}/sponsor-phases?${qs}`).then(r => setSponsorData(r.data.data || [])).catch(() => {}),
      axios.get(`${API}/biomarkers?${qs}`).then(r => setBiomarkerData(r.data.data || [])).catch(() => {}),
      axios.get(`${API}/status?${qs}`).then(r => setStatusData(r.data.data || [])).catch(() => {}),
      axios.get(`${API}/timeline?${qs}`).then(r => setTimelineData(r.data.data || [])).catch(() => {}),
      axios.get(`${API}/biomarker-phase?${qs}`).then(r => setBiomarkerPhaseData(r.data.data || [])).catch(() => {}),
      axios.get(`${API}/drug-landscape?${buildQS({ top_n: 24 })}`).then(r => setDrugLandscape(r.data.data || [])).catch(() => {}),
      axios.get(`${API}/status-phase?${qs}`).then(r => setStatusPhaseData(r.data.data || [])).catch(() => {}),
      axios.get(`${API}/top-sponsors-detailed?${buildQS({ top_n: 12 })}`).then(r => setTopSponsorsDetailed(r.data.data || [])).catch(() => {})
    ]).finally(() => setDataLoading(false));
    
    setArticlesLoading(true);
    axios.get(`${API}/articles?cancer=${encodeURIComponent(activeCancerQuery)}`)
      .then(r => { setArticles(r.data.articles || []); setArticleQuery(''); })
      .catch(() => setArticles([]))
      .finally(() => setArticlesLoading(false));

    const cacheKey = encodeURIComponent(activeCancerQuery);
    if (globalInsightCache[cacheKey]) {
      setInsight(globalInsightCache[cacheKey]);
    } else {
      setInsightLoading(true);
      axios.get(`${API}/insight?cancer=${cacheKey}`)
        .then(r => {
          const text = r.data.insight || '';
          setInsight(text);
          globalInsightCache[cacheKey] = text;
        })
        .catch(() => setInsight(''))
        .finally(() => setInsightLoading(false));
    }
  }, [activeCancerQuery, filters, buildQS]);

  useEffect(() => {
    let qs = buildQS({ top_n: 16 });
    if (activePhaseFilter) qs += `&phase=${encodeURIComponent(activePhaseFilter)}`;
    axios.get(`${API}/drugs?${qs}`).then(r => {
      const drugs = r.data.drugs || [];
      setDrugsData(drugs);
    }).catch(() => {});
  }, [activeCancerQuery, filters, activePhaseFilter, buildQS]);

  useEffect(() => {
    if (drugsData.length > 0) {
      if (!selectedCombinationDrug || !drugsData.some(d => d.drug_name === selectedCombinationDrug)) {
        setSelectedCombinationDrug(drugsData[0].drug_name);
      }
    } else {
      setSelectedCombinationDrug(null);
    }
  }, [drugsData]);

  useEffect(() => {
    if (!selectedCombinationDrug) {
      setCombinationStrategy(null);
      setComboLoading(false);
      return;
    }
    setComboLoading(true);
    axios.get(`${API}/drug-partners?${buildQS()}&drug=${encodeURIComponent(selectedCombinationDrug)}&top_n=10`)
      .then(res => setCombinationStrategy(res.data.data || null))
      .catch(() => setCombinationStrategy(null))
      .finally(() => setComboLoading(false));
  }, [activeCancerQuery, filters, buildQS, selectedCombinationDrug]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'vintage' ? 'dark' : 'vintage';
      document.documentElement.classList.toggle('dark', next === 'dark');
      return next;
    });
  };

  const handleSearchArticles = (e) => {
    e.preventDefault();
    setArticlesLoading(true);
    let url = `${API}/articles?cancer=${encodeURIComponent(activeCancerQuery)}`;
    if (articleQuery.trim()) url += `&query=${encodeURIComponent(articleQuery.trim())}`;
    axios.get(url)
      .then(r => setArticles(r.data.articles || []))
      .catch(() => setArticles([]))
      .finally(() => setArticlesLoading(false));
  };

  const handleExport = () => {
    window.print();
  };

  const handleExplainChart = () => {
    if (!zoomedChart) return;
    const prompt = `Can you explain the data shown in the ${zoomedChart.title} chart for ${parentCancer}?`;
    
    setZoomedChart(null);
    setIsChatbotOpen(true);
    
    const userMsg = { role: 'user', content: prompt };
    setChatMessages(prev => [...prev, userMsg]);
    setChatIsLoading(true);

    fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: prompt, cancer: activeCancerQuery })
    })
      .then(res => res.json())
      .then(data => setChatMessages(prev => [...prev, { role: 'assistant', content: data.answer }]))
      .catch(() => setChatMessages(prev => [...prev, { role: 'assistant', content: 'The intelligence server is not responding yet.' }]))
      .finally(() => setChatIsLoading(false));
  };

  const observationShare = useMemo(() => {
    if (!summary?.total_trials || !summary?.interventional_trials) return null;
    return Math.max(0, summary.total_trials - summary.interventional_trials);
  }, [summary]);

  const story = useMemo(() => {
    const largest = [...funnelData].sort((a, b) => (b.unique_trials || 0) - (a.unique_trials || 0))[0];
    const late = funnelData.find(row => row.phase === 'Phase 3');
    const risk = [...statusData].sort((a, b) => (b.count || 0) - (a.count || 0))[0];
    return { largest, late, risk };
  }, [funnelData, statusData]);

  const kpis = [
    { label: 'Total trials', value: summary?.total_trials, icon: Activity, note: 'All study types indexed' },
    { label: 'Interventional', value: summary?.interventional_trials, icon: FlaskConical, note: 'Main use-case denominator' },
    { label: 'Distinct assets', value: summary?.distinct_drugs, icon: TrendingUp, note: 'Runtime non-asset filter applied' },
    { label: 'Target patients', value: summary?.total_patients, icon: Users, note: 'Interventional enrollment' },
    { label: 'Countries', value: summary?.countries, icon: Globe, note: 'Trial footprint' },
  ];

  return (
    <div className="min-h-screen bg-background text-primary flex">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} onExport={handleExport} />
      
      <ReportView 
        cancer={activeCancerQuery} 
        summary={summary} 
        filters={filters} 
        funnelData={funnelData} 
        statusData={statusData} 
        geoData={geoData}
        drugsData={drugsData}
        sponsorData={sponsorData}
        biomarkerData={biomarkerData}
        biomarkerPhaseData={biomarkerPhaseData}
        drugLandscape={drugLandscape}
        statusPhaseData={statusPhaseData}
        timelineData={timelineData}
        chartInsights={chartInsights}
        theme={theme}
      />

      <ChartModal 
        isOpen={!!zoomedChart} 
        onClose={() => setZoomedChart(null)} 
        title={zoomedChart?.title} 
        subtitle={zoomedChart?.subtitle}
        onExplain={handleExplainChart}
      >
        {zoomedChart?.content}
      </ChartModal>

      <main className="flex-1 h-screen overflow-y-auto px-4 lg:px-7 py-6 max-w-full relative">
        <header className="sticky top-0 z-20 -mx-4 lg:-mx-7 mb-6 border-b border-border bg-background/90 px-4 lg:px-7 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {!isSidebarOpen && (
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 -ml-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-muted hover:text-primary transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-accent">ClinicalTrials.gov oncology landscape</div>
                <h1 className="text-2xl lg:text-4xl leading-tight font-bold text-primary">Cancer-Wise Pipeline Intelligence</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={toggleTheme} className="p-2 rounded-lg bg-surface border border-border shadow-sm text-muted hover:text-primary transition-colors" title="Toggle Chart Theme">
                {theme === 'vintage' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
              <select
                className="h-10 lg:h-11 min-w-[200px] lg:min-w-[220px] border border-border bg-surface px-3 text-sm font-semibold text-primary outline-none hover:border-accent focus:border-accent shadow-sm rounded-lg"
                value={parentCancer}
                onChange={handleParentCancerChange}
              >
                {parentCancers.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              
              {currentSubtypes.length > 0 && (
                <MultiSelectDropdown 
                  options={currentSubtypes}
                  selected={selectedSubtypes.includes(parentCancer) ? currentSubtypes : selectedSubtypes}
                  onChange={setSelectedSubtypes}
                  placeholder="Select subtypes"
                />
              )}
              
              <button onClick={() => setIsChatbotOpen(true)} className="flex items-center gap-2 p-2 lg:px-4 lg:py-2.5 rounded-lg bg-accent text-background font-semibold hover:bg-accent/90 transition-colors shadow-sm">
                <MessageSquare className="w-5 h-5" />
                <span className="hidden lg:inline text-sm">AI Assistant</span>
              </button>
            </div>
          </div>
        </header>

        <FilterBar filters={filters} setFilters={setFilters} />

        <section className="mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpis.map(kpi => <Metric key={kpi.label} {...kpi} />)}
        </section>

        <section className="mb-6 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4">
          <div className="bg-surface rounded-xl border border-border shadow-sm p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-primary">Strategic readout</h2>
              <span className="ml-auto text-[10px] text-muted bg-background px-2 py-0.5 rounded-full border border-border">GROQ INSIGHT</span>
            </div>
            <p className="text-sm leading-7 text-muted">
              {insightLoading ? 'Generating a dashboard-grounded interpretation...' : insight || `For ${parentCancer}, review the phase funnel, asset density, and sponsor heatmaps to identify development bottlenecks.`}
            </p>
          </div>
          <div className="bg-surface rounded-xl border border-border shadow-sm p-5 flex flex-col h-full">
            <h2 className="mb-4 text-sm font-semibold text-primary flex items-center gap-2">
              <Target className="w-4 h-4 text-accent" />
              Key Pipeline Indicators
            </h2>
            <div className="flex flex-col gap-3 flex-1 justify-center">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-accent/5 border border-accent/10">
                <div className="p-2.5 bg-accent/10 text-accent rounded-lg shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-primary">{story.largest?.phase || '-'}</div>
                  <div className="text-[11px] leading-snug text-muted mt-0.5">Primary locus of interventional trial activity</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 dark:bg-blue-900/10 dark:border-blue-800/30">
                <div className="p-2.5 bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded-lg shrink-0">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-primary">{fmt(story.late?.distinct_drugs)}</div>
                  <div className="text-[11px] leading-snug text-muted mt-0.5">Investigational assets actively in Phase 3</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 dark:bg-amber-900/10 dark:border-amber-800/30">
                <div className="p-2.5 bg-amber-500/10 text-amber-500 dark:text-amber-400 rounded-lg shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-primary">{fmt(observationShare)}</div>
                  <div className="text-[11px] leading-snug text-muted mt-0.5">Non-interventional / observational studies</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-12 gap-4">
          <Panel 
            className="col-span-12" 
            height="h-[430px]" 
            title="Global trial footprint" 
            subtitle={filters.country ? `Country-level trial density. Highlighting co-participating regions for ${filters.country}.` : "Country-level trial density. Pan and zoom to find regional concentration and recruitment coverage."} 
            chartInsights={chartInsights} 
            onGenerateInsight={handleFetchInsight} 
            chartData={geoData} 
            onZoom={() => setZoomedChart({ title: 'Global trial footprint', subtitle: 'Country-level trial density', content: <GeoMap data={geoData} theme={theme} /> })}
          >
            {filters.country && geoData.length > 1 && (
              <div className="absolute top-4 right-4 bg-surface/80 backdrop-blur border border-border shadow-md rounded-lg p-3 w-48 z-10 pointer-events-none">
                <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Top Co-Participants</h4>
                <ul className="space-y-1.5">
                  {geoData.filter(d => d.country !== filters.country).slice(0, 5).map(d => (
                    <li key={d.country} className="flex justify-between items-center text-xs">
                      <span className="text-secondary truncate pr-2" title={d.country}>{d.country}</span>
                      <span className="text-accent font-semibold bg-accent/10 px-1.5 py-0.5 rounded text-[10px]">{d.trial_count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <GeoMap data={geoData} theme={theme} />
          </Panel>

          <Panel className="col-span-12 lg:col-span-6" height="h-[400px]" title="Top Competitor Sponsors" subtitle="Leading organizations by trial count, reflecting primary pharma stakeholders and pressure." chartInsights={chartInsights} onGenerateInsight={handleFetchInsight} chartData={topSponsorsDetailed} onZoom={() => setZoomedChart({ title: 'Top Competitor Sponsors', subtitle: 'Leading organizations by trial count', content: <TopCompetitorsChart data={topSponsorsDetailed} theme={theme} /> })}>
            <TopCompetitorsChart data={topSponsorsDetailed} theme={theme} />
          </Panel>

          <Panel 
            loading={comboLoading}
            className="col-span-12 lg:col-span-6" 
            height="h-[400px]" 
            title="Combination Strategy Network" 
            subtitle={`Common drug partners co-appearing in trials with ${combinationStrategy?.drug || 'the leading asset'}.`} 
            chartInsights={chartInsights} 
            onGenerateInsight={handleFetchInsight} 
            chartData={combinationStrategy?.partners} 
            onZoom={() => setZoomedChart({ title: 'Combination Strategy Network', subtitle: 'Drug co-appearance in interventional trials', content: <CombinationStrategyChart strategyData={combinationStrategy} theme={theme} /> })}
            headerAction={
              <select 
                className="text-[11px] font-semibold border border-border bg-background rounded-md px-2 py-1 text-primary focus:outline-none focus:border-accent"
                value={selectedCombinationDrug || ''}
                onChange={e => setSelectedCombinationDrug(e.target.value)}
                onClick={e => e.stopPropagation()}
              >
                {drugsData.map(d => <option key={d.drug_name} value={d.drug_name}>{d.drug_name}</option>)}
              </select>
            }
          >
            <CombinationStrategyChart strategyData={combinationStrategy} theme={theme} />
          </Panel>

          <Panel loading={dataLoading} className="col-span-12 lg:col-span-5" height="h-[390px]" title="Interventional phase funnel" subtitle="Click a phase to focus the asset table. Combined phases are bucketed into each parent phase from the notebook logic." chartInsights={chartInsights} onGenerateInsight={handleFetchInsight} chartData={funnelData} onZoom={() => setZoomedChart({ title: 'Interventional phase funnel', subtitle: 'Trial attrition across phases', content: <FunnelChart data={funnelData} theme={theme} onPhaseClick={() => {}} /> })}>
            <FunnelChart data={funnelData} theme={theme} onPhaseClick={phase => setActivePhaseFilter(prev => prev === phase ? null : phase)} />
          </Panel>
          <Panel loading={dataLoading} className="col-span-12 lg:col-span-7" height="h-[390px]" title="Trial status composition" subtitle="Completed, active, recruiting, terminated and withdrawn trials reveal operational maturity and development friction." chartInsights={chartInsights} onGenerateInsight={handleFetchInsight} chartData={statusData} onZoom={() => setZoomedChart({ title: 'Trial status composition', subtitle: 'Overall operational health of trials', content: <StatusDonut data={statusData} theme={theme} /> })}>
            <StatusDonut data={statusData} theme={theme} />
          </Panel>

          <Panel loading={dataLoading} className="col-span-12" height="h-[430px]" title="Top investigational assets" subtitle="Non-assets such as placebo, controls, surgery, radiotherapy, questionnaires and broad therapy labels are excluded at API time." chartInsights={chartInsights} onGenerateInsight={handleFetchInsight} chartData={drugsData} onZoom={() => setZoomedChart({ title: 'Top investigational assets', subtitle: 'Leading active compounds and therapies', content: <BarChart data={drugsData} theme={theme} /> })}>
            {activePhaseFilter && (
              <button onClick={() => setActivePhaseFilter(null)} className="absolute right-5 top-5 z-10 border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent rounded-full hover:bg-accent/20 transition-colors">
                {activePhaseFilter} × clear
              </button>
            )}
            <BarChart data={drugsData} theme={theme} />
          </Panel>

          <Panel loading={dataLoading} className="col-span-12 lg:col-span-5" height="h-[420px]" title="Sponsor pressure by phase" subtitle="Shows whether industry, academic, network or government sponsors dominate each development stage." chartInsights={chartInsights} onGenerateInsight={handleFetchInsight} chartData={sponsorData} onZoom={() => setZoomedChart({ title: 'Sponsor pressure by phase', subtitle: 'Who is funding the pipeline at each stage', content: <SponsorHeatmap data={sponsorData} theme={theme} /> })}>
            <SponsorHeatmap data={sponsorData} theme={theme} />
          </Panel>
          <Panel loading={dataLoading} className="col-span-12 lg:col-span-7" height="h-[420px]" title="Biomarker concentration by phase" subtitle="NER-derived molecular signals show where precision-oncology strategy is concentrated." chartInsights={chartInsights} onGenerateInsight={handleFetchInsight} chartData={biomarkerPhaseData} onZoom={() => setZoomedChart({ title: 'Biomarker concentration by phase', subtitle: 'Targeted therapy signals across clinical development', content: biomarkerPhaseData.length ? <BiomarkerPhaseHeatmap data={biomarkerPhaseData} theme={theme} /> : <Empty label="Biomarker heatmap unavailable" /> })}>
            {biomarkerPhaseData.length ? <BiomarkerPhaseHeatmap data={biomarkerPhaseData} theme={theme} /> : <Empty label="Biomarker heatmap unavailable" />}
          </Panel>

          <Panel loading={dataLoading} className="col-span-12" height="h-[430px]" title="Asset landscape map" subtitle="X-axis: trial count, Y-axis: total enrollment, bubble size: phase breadth. Top 6 assets are labeled. Hover for details." chartInsights={chartInsights} onGenerateInsight={handleFetchInsight} chartData={drugLandscape} onZoom={() => setZoomedChart({ title: 'Asset landscape map', subtitle: 'Trials vs enrollment for top investigational assets', content: drugLandscape.length ? <AssetLandscape data={drugLandscape} theme={theme} /> : <Empty label="Asset landscape unavailable" /> })}>
            {drugLandscape.length ? <AssetLandscape data={drugLandscape} theme={theme} /> : <Empty label="Asset landscape unavailable" />}
          </Panel>

          <Panel loading={dataLoading} className="col-span-12" height="h-[410px]" title="Status x phase risk matrix" subtitle="Termination and withdrawal clusters by phase help identify bottlenecks beyond simple trial counts." chartInsights={chartInsights} onGenerateInsight={handleFetchInsight} chartData={statusPhaseData} onZoom={() => setZoomedChart({ title: 'Status x phase risk matrix', subtitle: 'Identifying trial failure and completion patterns', content: statusPhaseData.length ? <StatusPhaseHeatmap data={statusPhaseData} theme={theme} /> : <Empty label="Status-phase matrix unavailable" /> })}>
            {statusPhaseData.length ? <StatusPhaseHeatmap data={statusPhaseData} theme={theme} /> : <Empty label="Status-phase matrix unavailable" />}
          </Panel>

          <Panel loading={dataLoading} className="col-span-12" height="h-[390px]" title="Trial activity timeline" subtitle="New trials posted per year by phase, showing where activity is accelerating or cooling." chartInsights={chartInsights} onGenerateInsight={handleFetchInsight} chartData={timelineData} onZoom={() => setZoomedChart({ title: 'Trial activity timeline', subtitle: 'Historical pipeline momentum', content: <TimelineChart data={timelineData} theme={theme} /> })}>
            <TimelineChart data={timelineData} theme={theme} />
          </Panel>

          <section className="bg-surface rounded-xl border border-border shadow-sm col-span-12 lg:col-span-7 p-5 flex flex-col">
            <div className="mb-4 flex items-center gap-2">
              <Network className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-semibold text-primary">Molecular signals to watch</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 flex-1">
              {biomarkerData.slice(0, 10).map(item => (
                <div key={item.biomarker} className="flex items-center justify-between border border-border bg-background px-3 py-2 rounded-lg">
                  <span className="truncate text-sm text-muted mr-2">{item.biomarker}</span>
                  <span className="font-bold text-sm text-primary tabular-nums">{fmt(item.trial_count)}</span>
                </div>
              ))}
            </div>
            {biomarkerData && biomarkerData.length > 0 && (
              <div className="mt-4 border-t border-border/50 pt-3 shrink-0 relative z-10">
                <ChartInsight 
                  insight={chartInsights?.['Molecular signals to watch']?.text} 
                  loading={chartInsights?.['Molecular signals to watch']?.loading} 
                  onGenerate={() => handleFetchInsight('Molecular signals to watch', biomarkerData.slice(0, 10))} 
                />
              </div>
            )}
          </section>

          <section className="bg-surface rounded-xl border border-border shadow-sm col-span-12 lg:col-span-5 p-5">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-semibold text-primary">Recent PubMed context</h3>
            </div>
            <form onSubmit={handleSearchArticles} className="mb-4 flex gap-2">
              <input 
                type="text" 
                value={articleQuery} 
                onChange={e => setArticleQuery(e.target.value)} 
                placeholder="Ask PubMed (e.g. BRCA mutations...)" 
                className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-primary placeholder-muted outline-none focus:border-accent shadow-sm"
              />
              <button type="submit" disabled={articlesLoading} className="bg-accent text-background px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-accent/90 disabled:opacity-50">
                {articlesLoading ? '...' : 'Search'}
              </button>
            </form>
            <div className="space-y-3">
              {articlesLoading ? (
                <div className="text-sm text-muted text-center py-4">Fetching literature...</div>
              ) : articles.length ? articles.map(article => (
                <a key={article.url} href={article.url} target="_blank" rel="noreferrer" className="block border border-border bg-background p-3 hover:border-accent/50 transition-colors rounded-lg group">
                  <div className="line-clamp-2 text-sm font-semibold leading-5 text-primary group-hover:text-accent transition-colors">{article.title}</div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-muted">
                    <span>{article.date || article.journal || 'PubMed'}</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </a>
              )) : <Empty label="No PubMed articles returned yet" compact />}
            </div>
          </section>
        </section>
      </main>
      <Chatbot 
        cancer={activeCancerQuery} 
        isOpen={isChatbotOpen} 
        setIsOpen={setIsChatbotOpen} 
        messages={chatMessages}
        setMessages={setChatMessages}
        isLoading={chatIsLoading}
        setIsLoading={setChatIsLoading}
      />
    </div>
  );
}

function Empty({ label, compact = false }) {
  return (
    <div className={`flex ${compact ? 'h-24' : 'h-full'} items-center justify-center border border-dashed border-border bg-background/50 rounded-lg text-xs text-muted m-2`}>
      {label}
    </div>
  );
}
