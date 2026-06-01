import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { BookOpen, ExternalLink, ArrowRight, Send, Menu } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api';

export default function PubMed() {
  const [articles, setArticles] = useState([]);
  const [cancer, setCancer] = useState(() => localStorage.getItem('parentCancer') || 'Breast Cancer');
  const [cancerList, setCancerList] = useState([]);
  const [qaInput, setQaInput] = useState('');
  const [qaMessages, setQaMessages] = useState([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? saved === 'true' : false;
  });

  useEffect(() => {
    localStorage.setItem('sidebarOpen', isSidebarOpen);
  }, [isSidebarOpen]);

  useEffect(() => {
    axios.get(`${API}/cancers`).then(r => {
      const list = r.data.cancers || [];
      setCancerList(list);
    }).catch(() => setCancerList(['Breast Cancer', 'Lung Cancer', 'Melanoma']));
  }, []);

  const [articleQuery, setArticleQuery] = useState('');

  useEffect(() => {
    setArticles([]);
    axios.get(`${API}/articles?cancer=${encodeURIComponent(cancer)}${articleQuery ? `&query=${encodeURIComponent(articleQuery)}` : ''}`)
      .then(res => setArticles(res.data.articles || []))
      .catch(() => setArticles([]));
  }, [cancer]);

  const handleSearchArticles = (e) => {
    e.preventDefault();
    setArticles([]);
    axios.get(`${API}/articles?cancer=${encodeURIComponent(cancer)}${articleQuery ? `&query=${encodeURIComponent(articleQuery)}` : ''}`)
      .then(res => setArticles(res.data.articles || []))
      .catch(() => setArticles([]));
  };

  const handleQA = async (e) => {
    e.preventDefault();
    if (!qaInput.trim() || qaLoading) return;
    const question = qaInput;
    setQaMessages(prev => [...prev, { role: 'user', text: question }]);
    setQaInput('');
    setQaLoading(true);
    try {
      const res = await axios.post(`${API}/chat`, { question, cancer });
      setQaMessages(prev => [...prev, { role: 'assistant', text: res.data.answer }]);
    } catch {
      setQaMessages(prev => [...prev, { role: 'assistant', text: 'Unable to connect to the intelligence server.' }]);
    } finally { setQaLoading(false); }
  };

  return (
    <div className="h-screen flex bg-background text-primary font-sans overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-muted hover:text-primary transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg hidden sm:block">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-primary">Literature & Research</h1>
                <p className="text-xs text-muted">Live PubMed RSS feed for {cancer}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearchArticles} className="relative">
              <input 
                type="text" 
                value={articleQuery} 
                onChange={e => setArticleQuery(e.target.value)}
                placeholder="Search specific topic..."
                className="bg-surface border border-border text-primary pl-3 pr-8 py-1.5 rounded-lg font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-[200px]"
              />
              <button type="submit" className="absolute right-2 top-1.5 bottom-1.5 text-muted hover:text-primary">
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <select 
              className="bg-surface border border-border text-primary px-3 py-1.5 rounded-lg font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm max-w-[200px] sm:max-w-[280px]"
              value={cancer} 
              onChange={e => {
                const c = e.target.value;
                setCancer(c);
                setArticleQuery(''); // Reset search on cancer change
                localStorage.setItem('parentCancer', c);
                localStorage.setItem('selectedSubtypes', JSON.stringify([c]));
              }}
            >
              {cancerList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Articles */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {articles.length === 0 ? (
                <div className="p-8 text-center text-muted bg-surface rounded-2xl border border-border">
                  <BookOpen className="w-8 h-8 mx-auto mb-3 text-muted/50" />
                  <p>Loading latest research articles...</p>
                </div>
              ) : articles.map((art, i) => (
                <div key={i} className="p-5 bg-surface rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow group">
                  <h3 className="text-base font-bold text-primary mb-2 line-clamp-2 leading-snug">{art.title}</h3>
                  <div className="text-xs text-muted mb-3 font-medium flex items-center gap-3">
                    {art.date && <span>{art.date}</span>}
                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full">PubMed</span>
                  </div>
                  <p className="text-sm text-primary/70 mb-3 line-clamp-3 leading-relaxed">{art.snippet}</p>
                  <a href={art.url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
                    Read on PubMed <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Q&A Sidebar */}
          <aside className="w-full lg:w-[400px] border-l border-border bg-surface flex flex-col shrink-0 h-[400px] lg:h-auto">
             <div className="p-5 border-b border-border bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-surface">
              <h2 className="font-bold text-primary flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Literature Q&A
              </h2>
              <p className="text-xs text-muted mt-1">Ask questions about oncology research for {cancer}</p>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {qaMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-3">
                    <BookOpen className="w-7 h-7 text-blue-300 dark:text-blue-500" />
                  </div>
                  <p className="text-xs text-muted max-w-[220px]">Ask about the latest findings, mechanisms, or trial outcomes in these papers.</p>
                </div>
              )}
              {qaMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-background text-primary border border-border rounded-tl-sm'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {qaLoading && (
                <div className="flex gap-1.5 p-3">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              )}
            </div>

            <form onSubmit={handleQA} className="p-4 border-t border-border bg-background">
              <div className="relative">
                <input type="text" value={qaInput} onChange={e => setQaInput(e.target.value)}
                  placeholder="Summarize recent findings..."
                  className="w-full pl-4 pr-12 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm" />
                <button type="submit" disabled={!qaInput.trim() || qaLoading}
                  className="absolute right-2 top-1.5 bottom-1.5 aspect-square bg-blue-600 hover:bg-blue-700 disabled:bg-muted text-white rounded-lg flex items-center justify-center transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </aside>
        </div>
      </main>
    </div>
  );
}
