import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

const NODE_COLORS = [
  '#10B981', '#06B6D4', '#F59E0B', '#EC4899', '#8B5CF6',
  '#3B82F6', '#F43F5E', '#14B8A6', '#D946EF', '#0EA5E9',
];

export default function CombinationStrategyChart({ strategyData, theme = 'dark' }) {
  const isDark = theme === 'dark';
  const [view, setView] = useState('network'); // 'network', 'bipartite', 'regimens'

  const option = useMemo(() => {
    // Graceful fallback for legacy or empty data
    if (!strategyData || !strategyData.partners || strategyData.partners.length === 0) return {};
    
    const { drug, partners, interconnections = [], bipartite = {nodes:[], links:[]}, upset = [] } = strategyData;
    const maxCoapp = Math.max(...partners.map(p => p.coappearance_trials), 1);

    if (view === 'network') {
      const nodes = [
        { 
          name: drug, 
          value: 100, 
          symbolSize: 65, 
          itemStyle: {
            color: '#6366F1',
            shadowColor: 'rgba(99,102,241,0.5)',
            shadowBlur: 20,
            borderColor: '#818CF8',
            borderWidth: 2,
          },
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'Inter',
            color: '#FFFFFF',
            backgroundColor: 'rgba(99,102,241,0.85)',
            padding: [4, 10],
            borderRadius: 6,
          }
        }
      ];
      
      const links = [];
      
      partners.forEach((p, idx) => {
        const size = Math.max(24, (p.coappearance_trials / maxCoapp) * 50);
        const color = NODE_COLORS[idx % NODE_COLORS.length];
        
        nodes.push({
          name: p.partner,
          value: p.coappearance_trials,
          symbolSize: size,
          itemStyle: {
            color: color + 'CC',
            borderColor: color,
            borderWidth: 1.5,
            shadowColor: color + '40',
            shadowBlur: 8,
          }
        });
        
        links.push({
          source: drug,
          target: p.partner,
          value: p.coappearance_trials,
          lineStyle: { 
            width: Math.max(1.5, (p.coappearance_trials / maxCoapp) * 6),
            color: isDark ? 'rgba(148,163,184,0.25)' : 'rgba(100,116,139,0.25)',
            curveness: 0.15 + (idx % 3) * 0.05,
          }
        });
      });

      return {
        backgroundColor: 'transparent',
        animationDuration: 1000,
        tooltip: {
          backgroundColor: isDark ? 'rgba(8,18,36,0.95)' : 'rgba(255,255,255,0.96)',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          borderWidth: 1,
          borderRadius: 12,
          padding: [12, 16],
          textStyle: { color: isDark ? '#F1F5F9' : '#0F172A', fontFamily: 'Inter', fontSize: 12 },
          formatter: (p) => {
            if (p.dataType === 'node') {
              if (p.data.name === drug) return `<div style="font-weight:700;font-size:13px">${drug}</div><span style="opacity:0.6">Primary asset</span>`;
              return `<div style="font-weight:700;font-size:13px;margin-bottom:4px">${p.data.name}</div><span style="font-size:16px;font-weight:700">${p.data.value}</span><span style="opacity:0.6;margin-left:4px">trials</span>`;
            }
            return `<div style="font-weight:600;font-size:12px;margin-bottom:4px">${p.data.source} + ${p.data.target}</div><span style="font-size:14px;font-weight:700">${p.data.value}</span><span style="opacity:0.6;margin-left:4px">trials</span>`;
          }
        },
        series: [{
          type: 'graph',
          layout: 'force',
          force: { repulsion: 500, edgeLength: [80, 160], gravity: 0.08, friction: 0.6 },
          roam: true, draggable: true,
          label: { show: true, position: 'bottom', formatter: '{b}', color: isDark ? '#CBD5E1' : '#334155', fontSize: 10, distance: 6 },
          data: nodes, links: links,
          emphasis: { focus: 'adjacency', lineStyle: { width: 4 }, label: { fontWeight: 700 } },
        }]
      };
    }

    if (view === 'regimens') {
      const sorted = [...upset].filter(u => u.sets.length > 1).sort((a,b) => a.count - b.count).slice(-12);
      const yAxisData = sorted.map(s => s.sets.join(' + '));
      const seriesData = sorted.map(s => s.count);

      return {
        backgroundColor: 'transparent',
        animationDuration: 1200,
        animationEasing: 'cubicOut',
        tooltip: { 
          trigger: 'axis', 
          axisPointer: { type: 'shadow' },
          backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
          borderColor: isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)',
          textStyle: { color: isDark ? '#F8FAFC' : '#0F172A', fontFamily: 'Inter' },
          formatter: (params) => {
             const p = params[0];
             return `<div style="font-size:11px;opacity:0.7;margin-bottom:4px">Regimen</div><div style="font-weight:700;margin-bottom:6px;max-width:250px;white-space:normal">${p.name}</div><div style="font-size:14px;font-weight:700;color:#8B5CF6">${p.value} <span style="font-size:12px;font-weight:500;color:${isDark?'#94A3B8':'#64748B'}">trials</span></div>`;
          }
        },
        grid: { left: '38%', right: '10%', bottom: '2%', top: '2%', containLabel: false },
        xAxis: { type: 'value', show: false },
        yAxis: { 
          type: 'category', 
          data: yAxisData,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            show: true,
            color: isDark ? '#CBD5E1' : '#475569',
            fontFamily: 'Inter',
            fontSize: 11,
            fontWeight: 600,
            width: 250,
            overflow: 'truncate',
            align: 'right',
            margin: 16
          }
        },
        visualMap: {
          show: false,
          min: Math.min(...seriesData) || 0,
          max: Math.max(...seriesData) || 100,
          dimension: 0,
          inRange: {
            color: ['#3B82F6', '#8B5CF6'] // Light blue to purple
          }
        },
        series: [{
          type: 'bar',
          data: seriesData,
          barWidth: '60%',
          showBackground: true,
          backgroundStyle: {
            color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
            borderRadius: [0, 6, 6, 0]
          },
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
            shadowColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.3)',
            shadowBlur: 10,
            shadowOffsetY: 4
          },
          label: {
            show: true,
            position: 'right',
            distance: 10,
            color: isDark ? '#F1F5F9' : '#0F172A',
            fontFamily: 'Inter',
            fontWeight: 800,
            fontSize: 13,
            formatter: '{c}'
          }
        }]
      };
    }

    return {};
  }, [strategyData, isDark, view]);

  if (!strategyData || !strategyData.partners || strategyData.partners.length === 0) {
    return <div className="h-full flex items-center justify-center text-muted text-sm">Not enough combination data</div>;
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      {strategyData.partners?.length > 0 && (
        <div className="absolute top-2 left-2 z-10 flex gap-1 p-1 bg-background/95 backdrop-blur-md border border-border/50 rounded-lg shadow-sm">
          {['network', 'regimens'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all duration-300 ${view === v ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md' : 'text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              {v}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 min-h-0 pt-10">
        <ReactECharts key={`${theme}-${view}`} theme={theme} option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}
