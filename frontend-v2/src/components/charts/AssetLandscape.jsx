import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

const BUBBLE_PALETTE = [
  '#6366F1', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6',
  '#06B6D4', '#F43F5E', '#84CC16', '#0EA5E9', '#D946EF',
  '#14B8A6', '#EF4444', '#A855F7', '#F97316', '#3B82F6',
  '#E11D48', '#22D3EE', '#FBBF24', '#34D399', '#FB7185',
  '#818CF8', '#2DD4BF', '#FB923C', '#C084FC',
];

export default function AssetLandscape({ data = [], theme = 'dark' }) {
  const isDark = theme === 'dark';
  const option = useMemo(() => {
    if (!data.length) return {};

    // Use log scale for enrollment to spread out the bubbles
    const maxTrials = Math.max(...data.map(d => d.unique_trials || 1));
    const maxEnroll = Math.max(...data.map(d => d.total_enrollment || 1));

    // Show top drug labels (top 5 by trial count)
    const sorted = [...data].sort((a, b) => (b.unique_trials || 0) - (a.unique_trials || 0));
    const topNames = new Set(sorted.slice(0, 6).map(d => d.drug_name));

    return {
      backgroundColor: 'transparent',
      animationDuration: 1200,
      animationEasing: 'elasticOut',
      tooltip: {
        backgroundColor: isDark ? 'rgba(8,18,36,0.95)' : 'rgba(255,255,255,0.96)',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        borderRadius: 12,
        padding: [12, 16],
        textStyle: { color: isDark ? '#F1F5F9' : '#0F172A', fontFamily: 'Inter', fontSize: 12 },
        extraCssText: 'box-shadow: 0 8px 32px rgba(0,0,0,0.2); backdrop-filter: blur(8px);',
        formatter: p => {
          const d = p.value;
          return `<div style="font-weight:700;font-size:13px;margin-bottom:6px">${d[3]}</div>` +
                 `<div style="display:grid;grid-template-columns:auto auto;gap:2px 12px;font-size:11px">` +
                 `<span style="opacity:0.7">Trials</span><span style="font-weight:600">${d[0].toLocaleString()}</span>` +
                 `<span style="opacity:0.7">Enrollment</span><span style="font-weight:600">${(d[1] || 0).toLocaleString()}</span>` +
                 `<span style="opacity:0.7">Phases covered</span><span style="font-weight:600">${d[2]}</span>` +
                 `</div>`;
        }
      },
      visualMap: {
        show: false,
        dimension: 1,
        min: 0,
        max: maxEnroll,
        inRange: {
          color: isDark
            ? ['#10B981', '#3B82F6', '#8B5CF6', '#F43F5E']
            : ['#34D399', '#60A5FA', '#A78BFA', '#FB7185']
        }
      },
      grid: { left: 80, right: 40, top: 30, bottom: 56 },
      xAxis: {
        name: 'Number of trials',
        nameLocation: 'center',
        nameGap: 36,
        type: 'value',
        max: Math.ceil(maxTrials * 1.1),
        splitLine: { lineStyle: { color: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(0,0,0,0.06)', type: 'dashed' } },
        axisLabel: { color: isDark ? '#94A3B8' : '#64748B', fontFamily: 'Inter', fontSize: 11 },
        nameTextStyle: { color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600, fontFamily: 'Inter', fontSize: 12 },
        axisLine: { lineStyle: { color: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.1)' } },
      },
      yAxis: {
        name: 'Total enrollment',
        nameLocation: 'center',
        nameGap: 58,
        type: 'value',
        max: Math.ceil(maxEnroll * 1.1),
        splitLine: { lineStyle: { color: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(0,0,0,0.06)', type: 'dashed' } },
        axisLabel: {
          color: isDark ? '#94A3B8' : '#64748B', fontFamily: 'Inter', fontSize: 11,
          formatter: v => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v
        },
        nameTextStyle: { color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600, fontFamily: 'Inter', fontSize: 12 },
        axisLine: { lineStyle: { color: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.1)' } },
      },
      series: [{
        type: 'scatter',
        symbolSize: (val) => {
          const phases = val[2] || 1;
          return Math.max(16, phases * 14);
        },
        itemStyle: {
          opacity: 0.8,
          borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
          borderWidth: 1,
        },
        data: data.map((d, i) => ({
          value: [d.unique_trials, d.total_enrollment || 0, d.phases_covered, d.drug_name]
        })),
        label: {
          show: true,
          formatter: p => topNames.has(p.data.value[3]) ? p.data.value[3] : '',
          position: 'top',
          color: isDark ? '#CBD5E1' : '#334155',
          fontWeight: 600,
          fontSize: 10,
          fontFamily: 'Inter',
          distance: 8,
        },
        labelLayout: { hideOverlap: true },
        emphasis: {
          focus: 'self',
          label: {
            show: true,
            formatter: p => p.data.value[3],
            position: 'top',
            color: isDark ? '#F1F5F9' : '#0F172A',
            fontWeight: 700,
            fontSize: 12,
            fontFamily: 'Inter',
            backgroundColor: isDark ? 'rgba(22,36,58,0.92)' : 'rgba(255,255,255,0.92)',
            padding: [4, 10],
            borderRadius: 6,
            borderColor: isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)',
            borderWidth: 1,
          },
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(99,102,241,0.5)',
          }
        },
      }]
    };
  }, [data, isDark]);

  return <ReactECharts key={theme} theme={theme} option={option} style={{ height: '100%', width: '100%' }} />;
}
