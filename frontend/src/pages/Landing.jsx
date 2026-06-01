import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Database, Stethoscope, ChevronRight, Ribbon, Search } from 'lucide-react';
import BackgroundAnimation from '../components/BackgroundAnimation';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api';

export default function Landing() {
  const navigate = useNavigate();
  const [cancers, setCancers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ trials: 0, distinct: 0 });

  useEffect(() => {
    // Force dark theme for the landing page
    document.documentElement.classList.add('dark');
    const cleanup = () => document.documentElement.classList.remove('dark');

    axios.get(`${API}/hierarchy`).then(res => {
      setCancers(Object.keys(res.data || {}));
      setLoading(false);
    }).catch(() => {
      setCancers(['Breast Cancer', 'Lung Cancer', 'Melanoma', 'Colorectal Cancer', 'Prostate Cancer']);
      setLoading(false);
    });

    axios.get(`${API}/health`).then(res => {
        if(res.data) setStats({ trials: res.data.trials, distinct: res.data.cancers });
    }).catch(() => {});
    
    return cleanup;
  }, []);

  const filtered = cancers.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  return (
    <main className="relative min-h-screen bg-background text-primary selection:bg-accent/30 font-sans overflow-hidden">
      {/* Premium Video-like Animated Background */}
      <BackgroundAnimation />
      
      {/* Existing ambient glowing blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-20 flex flex-col min-h-screen">
        <header className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 border border-accent/20">
              <Ribbon className="h-5 w-5 text-accent rotate-180" />
            </div>
            <div>
              <div className="text-xl font-bold leading-none tracking-tight">OncoSight</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted mt-1">Analytics</div>
            </div>
          </div>
          <div className="flex gap-4">
             <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-muted">
                 <span>{stats.trials.toLocaleString()}+ Indexed Trials</span>
                 <span>{stats.distinct} Indications</span>
             </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row gap-16 lg:gap-24 items-start">
          <div className="md:w-1/2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold uppercase tracking-wider mb-6 border border-accent/20">
              <Database className="w-3 h-3" />
              Live Data Ingestion
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
              Navigate The Oncology <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-500">Pipeline.</span>
            </h1>
            <p className="text-lg text-muted leading-relaxed mb-10 max-w-xl">
              Track interventional trial activity across development phases. Surface emerging assets, precision biomarkers, competitive sponsor pressure, and literature context in one unified intelligence workspace.
            </p>
            
            <div className="relative max-w-md group">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                   <Search className="h-5 w-5 text-muted group-focus-within:text-accent transition-colors" />
               </div>
               <input
                  type="text"
                  placeholder="Search indications..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-surface border border-border rounded-2xl py-4 pl-12 pr-4 text-primary placeholder-muted shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
               />
            </div>
          </div>

          <div className="md:w-1/2 w-full">
             <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-xl shadow-black/5">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-accent" />
                        Explore Indications
                    </h2>
                    <span className="text-xs font-semibold text-muted bg-background px-3 py-1 rounded-full border border-border">
                        {filtered.length} Cancers
                    </span>
                </div>
                
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="animate-pulse space-y-3">
                            {[1,2,3,4,5].map(i => (
                                <div key={i} className="h-16 bg-background rounded-2xl w-full" />
                            ))}
                        </div>
                    ) : filtered.length > 0 ? (
                        filtered.map(c => (
                            <button
                                key={c}
                                onClick={() => navigate(`/dashboard?cancer=${encodeURIComponent(c)}`)}
                                className="w-full flex items-center justify-between p-4 bg-background border border-border rounded-2xl hover:border-accent/50 hover:shadow-md transition-all group text-left"
                            >
                                <span className="font-semibold text-primary group-hover:text-accent transition-colors">{c}</span>
                                <ChevronRight className="w-5 h-5 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                            </button>
                        ))
                    ) : (
                        <div className="text-center py-10 text-muted">
                            No indications found matching "{search}"
                        </div>
                    )}
                </div>
             </div>
          </div>
        </div>

        <footer className="mt-auto pt-24 pb-8 text-center text-muted text-sm font-medium">
          <p className="flex items-center justify-center gap-2">
            Built by Lakshay Malik
          </p>
        </footer>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--text-2); }
      `}} />
    </main>
  );
}
