import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

const RANK_PALETTE = [
  ['#6366F1', '#818CF8'], ['#8B5CF6', '#A78BFA'], ['#EC4899', '#F472B6'],
  ['#F43F5E', '#FB7185'], ['#F59E0B', '#FBBF24'], ['#10B981', '#34D399'],
  ['#06B6D4', '#22D3EE'], ['#3B82F6', '#60A5FA'], ['#D946EF', '#E879F9'],
  ['#14B8A6', '#2DD4BF'], ['#EF4444', '#F87171'], ['#84CC16', '#A3E635'],
  ['#0EA5E9', '#38BDF8'], ['#F97316', '#FB923C'], ['#A855F7', '#C084FC'],
  ['#E11D48', '#FB7185'],
];

export default function BarChart({ data = [], theme = 'dark', onDrugClick }) {
  const isDark = theme === 'dark';
  const option = useMemo(() => {
    const rows = [...data].reverse();
    return {
      backgroundColor: 'transparent',
      animationDuration: 1000,
      animationEasing: 'cubicInOut',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)' } },
        backgroundColor: isDark ? 'rgba(8,18,36,0.95)' : 'rgba(255,255,255,0.96)',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        borderRadius: 12,
        padding: [12, 16],
        textStyle: { color: isDark ? '#F1F5F9' : '#0F172A', fontFamily: 'Inter', fontSize: 12 },
        extraCssText: 'box-shadow: 0 8px 32px rgba(0,0,0,0.2); backdrop-filter: blur(8px);',
        formatter: (params) => {
          const p = params[0];
          const d = data.find(r => r.drug_name === p.name);
          if (!d) return `${p.name}: ${p.value}`;
          return `<div style="font-weight:700;font-size:13px;margin-bottom:6px">${d.drug_name}</div>` +
                 `<div style="display:grid;grid-template-columns:auto auto;gap:2px 12px;font-size:11px">` +
                 `<span style="opacity:0.7">Trials</span><span style="font-weight:600">${d.trial_count}</span>` +
                 `<span style="opacity:0.7">Phases</span><span style="font-weight:600">${(d.phases || []).join(', ')}</span>` +
                 `<span style="opacity:0.7">Enrollment</span><span style="font-weight:600">${(d.total_enrollment || 0).toLocaleString()}</span>` +
                 `</div>`;
        }
      },
      visualMap: {
        show: false,
        dimension: 0,
        min: Math.min(...rows.map(r => r.trial_count), 0),
        max: Math.max(...rows.map(r => r.trial_count), 1),
        inRange: {
          color: isDark
            ? ['#1e1b4b', '#4338ca', '#8b5cf6', '#ec4899', '#f43f5e']
            : ['#e0e7ff', '#818cf8', '#a855f7', '#f472b6', '#f43f5e']
        }
      },
      grid: { left: 160, right: 60, bottom: 28, top: 18 },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(0,0,0,0.06)', type: 'dashed' } },
        axisLabel: { color: isDark ? '#94A3B8' : '#64748B', fontFamily: 'Inter', fontSize: 11 }
      },
      yAxis: {
        type: 'category',
        data: rows.map(d => d.drug_name),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          interval: 0, width: 145, overflow: 'truncate',
          color: isDark ? '#CBD5E1' : '#334155', fontSize: 11, fontFamily: 'Inter'
        }
      },
      series: [{
        name: 'Trials',
        type: 'bar',
        barWidth: 16,
        data: rows.map((d, i) => ({
          value: d.trial_count,
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
            shadowColor: 'rgba(0,0,0,0.08)',
            shadowBlur: 4,
            shadowOffsetX: 2,
          }
        })),
        emphasis: {
          itemStyle: { shadowBlur: 12, shadowColor: 'rgba(99,102,241,0.3)' }
        },
        label: {
          show: true, position: 'right',
          color: isDark ? '#94A3B8' : '#64748B',
          fontSize: 11, fontWeight: 600, fontFamily: 'Inter',
          formatter: p => p.value.toLocaleString()
        }
      }]
    };
  }, [data, isDark]);

  const onEvents = {
    click: (params) => { if (onDrugClick) onDrugClick(params.name); }
  };

  return <ReactECharts key={theme} theme={theme} option={option} onEvents={onEvents} style={{ height: '100%', width: '100%' }} />;
}
