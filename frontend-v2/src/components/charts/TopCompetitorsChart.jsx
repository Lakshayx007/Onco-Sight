import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

const BAR_PALETTE = [
  ['#6366F1', '#818CF8'], ['#8B5CF6', '#A78BFA'], ['#EC4899', '#F472B6'],
  ['#F43F5E', '#FB7185'], ['#F59E0B', '#FBBF24'], ['#10B981', '#34D399'],
  ['#06B6D4', '#22D3EE'], ['#3B82F6', '#60A5FA'], ['#D946EF', '#E879F9'],
  ['#14B8A6', '#2DD4BF'], ['#EF4444', '#F87171'], ['#0EA5E9', '#38BDF8'],
];

export default function TopCompetitorsChart({ data = [], theme = 'dark' }) {
  const isDark = theme === 'dark';
  const option = useMemo(() => {
    if (!data || data.length === 0) return {};
    
    const sortedData = [...data].sort((a, b) => a.count - b.count);
    const sponsors = sortedData.map(d => d.sponsor);
    const counts = sortedData.map(d => d.count);

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
          return `<div style="font-weight:700;font-size:13px;margin-bottom:4px">${params[0].name}</div>` +
                 `<span style="font-size:18px;font-weight:700">${params[0].value.toLocaleString()}</span>` +
                 `<span style="opacity:0.6;margin-left:6px">trials</span>`;
        }
      },
      grid: { left: 145, right: 50, top: 10, bottom: 20 },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(0,0,0,0.06)', type: 'dashed' } },
        axisLabel: { color: isDark ? '#94A3B8' : '#64748B', fontFamily: 'Inter', fontSize: 11 }
      },
      yAxis: {
        type: 'category',
        data: sponsors,
        axisLabel: {
          color: isDark ? '#CBD5E1' : '#334155',
          width: 135, overflow: 'truncate',
          fontSize: 11, fontFamily: 'Inter'
        },
        axisTick: { show: false },
        axisLine: { show: false }
      },
      series: [
        {
          name: 'Trials',
          type: 'bar',
          data: counts.map((val, i) => ({
            value: val,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: BAR_PALETTE[i % BAR_PALETTE.length][0] },
                { offset: 1, color: BAR_PALETTE[i % BAR_PALETTE.length][1] },
              ]),
              borderRadius: [0, 6, 6, 0],
              shadowColor: 'rgba(0,0,0,0.08)',
              shadowBlur: 4,
              shadowOffsetX: 2,
            }
          })),
          emphasis: {
            itemStyle: { shadowBlur: 12, shadowColor: 'rgba(99,102,241,0.3)' }
          },
          barWidth: '55%',
          label: {
            show: true, position: 'right',
            color: isDark ? '#94A3B8' : '#64748B',
            fontSize: 11, fontWeight: 600, fontFamily: 'Inter',
            formatter: p => p.value.toLocaleString()
          }
        }
      ]
    };
  }, [data, isDark]);

  return <ReactECharts key={theme} theme={theme} option={option} style={{ height: '100%', width: '100%' }} />;
}
