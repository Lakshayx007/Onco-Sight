import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

export default function ChartInsight({ insight, loading, onGenerate }) {
  if (!insight && !loading) {
    return (
      <button 
        onClick={onGenerate}
        className="mt-3 flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors w-full justify-center bg-accent/5 py-1.5 rounded-md border border-accent/10"
      >
        <Sparkles className="w-3.5 h-3.5" /> Generate AI Insight
      </button>
    );
  }

  return (
    <div className="mt-3 text-[11px] leading-relaxed text-muted bg-surface/50 p-2.5 rounded-md border border-border">
      <div className="flex items-center gap-1.5 mb-1.5 text-accent font-medium">
        <Sparkles className="w-3.5 h-3.5" /> AI Analysis
      </div>
      {loading ? (
        <span className="animate-pulse">Generating strategic insight...</span>
      ) : (
        <span>{insight}</span>
      )}
    </div>
  );
}
