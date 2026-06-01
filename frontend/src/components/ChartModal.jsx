import React from 'react';
import { X, Sparkles } from 'lucide-react';

export default function ChartModal({ isOpen, onClose, title, subtitle, children, onExplain }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 lg:p-12">
      <div className="bg-background w-full max-w-6xl h-full max-h-[85vh] rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface">
          <div>
            <h2 className="text-xl font-bold text-primary">{title}</h2>
            {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-4">
            {onExplain && (
              <button 
                onClick={onExplain}
                className="flex items-center gap-2 bg-accent text-background px-4 py-2 rounded-lg font-semibold hover:bg-accent/90 transition-colors shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                Explain with AI
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-muted hover:text-primary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="flex-1 p-6 relative min-h-0 bg-surface/50">
          {children}
        </div>
      </div>
    </div>
  );
}
