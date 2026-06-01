import React from 'react';
import { NavLink } from 'react-router-dom';
import { Ribbon, BookOpen, Download, LayoutDashboard, Home, ChevronLeft, Building2 } from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen, onExport }) {
  const navItems = [
    { name: 'Home', icon: Home, path: '/' },
    { name: 'Pipeline', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Literature', icon: BookOpen, path: '/pubmed' },
  ];

  return (
    <>
      <aside 
        className={`z-40 flex h-screen flex-col border-r border-border bg-surface shadow-sm transition-all duration-300 ease-in-out overflow-hidden
          ${isOpen ? 'w-64 fixed lg:relative lg:flex-shrink-0 translate-x-0 lg:translate-x-0' : 'w-64 lg:w-0 fixed lg:relative lg:flex-shrink-0 -translate-x-full lg:translate-x-0'}`}
      >
        <div className="w-64 flex flex-col h-full min-w-[16rem]">
          <div className="border-b border-border px-6 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center border border-accent/40 bg-accent/10 rounded-lg">
                <Ribbon className="h-5 w-5 text-accent" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted">Onco</div>
                <div className="text-lg font-bold leading-none tracking-tight text-primary">Sight</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-muted hover:text-primary transition-colors">
               <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-3 py-5">
            <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">Workspace</div>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 border border-transparent px-3 py-3 text-sm font-semibold rounded-lg transition-colors ${
                        isActive
                          ? 'bg-accent/10 text-accent'
                          : 'text-muted hover:bg-background hover:text-primary'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </NavLink>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-border p-4">
            {onExport && (
              <button onClick={onExport} className="flex w-full items-center gap-3 border border-border bg-background px-3 py-3 text-left text-sm font-semibold text-muted hover:border-accent/40 hover:text-primary rounded-lg transition-colors">
                <Download className="h-4 w-4" />
                Export view
              </button>
            )}
            <p className="mt-4 text-[10px] leading-5 text-muted">
              ClinicalTrials.gov data processed locally with NER-derived biomarkers and asset normalization.
            </p>
          </div>
        </div>
      </aside>
      
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden transition-opacity" 
        />
      )}
    </>
  );
}
