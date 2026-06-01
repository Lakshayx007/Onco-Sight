import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

export default function SponsorHeatmap({ data = [], theme = 'dark' }) {
  const isDark = theme === 'dark';
  const option = useMemo(() => {
    if (!data.length) return {};
    const phases = data.map(d => d.phase);
    const sponsorKeys = Object.keys(data[0]).filter(k => k !== 'phase' && data.some(row => (row[k] || 0) > 0));
    const maxVal = Math.max(...data.flatMap(d => sponsorKeys.map(k => d[k] || 0)), 1);
    const heatData = [];
    sponsorKeys.forEach((sponsor, yi) => {
      data.forEach((d, xi) => {
        const val = d[sponsor] || 0;
        if (val > 0) heatData.push([xi, yi, val]);
      });
    });

    return {
      backgroundColor: 'transparent',
      animationDuration: 800,
      animationEasing: 'cubicInOut',
      tooltip: {
        position: 'top',
        backgroundColor: isDark ? 'rgba(8,18,36,0.95)' : 'rgba(255,255,255,0.96)',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        borderRadius: 12,
        padding: [12, 16],
        textStyle: { color: isDark ? '#F1F5F9' : '#0F172A', fontFamily: 'Inter', fontSize: 12 },
        extraCssText: 'box-shadow: 0 8px 32px rgba(0,0,0,0.2); backdrop-filter: blur(8px);',
        formatter: p => {
          return `<div style="font-weight:700;font-size:12px;margin-bottom:4px">${sponsorKeys[p.value[1]]} × ${phases[p.value[0]]}</div>` +
                 `<span style="font-size:16px;font-weight:700">${p.value[2].toLocaleString()}</span>` +
                 `<span style="opacity:0.6;margin-left:4px">trials</span>`;
        }
      },
      grid: { left: 130, right: 28, top: 14, bottom: 85 },
      xAxis: {
        type: 'category',
        data: phases,
        axisLabel: { color: isDark ? '#94A3B8' : '#64748B', rotate: 20, fontSize: 11, fontFamily: 'Inter' },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(0,0,0,0.08)' } },
        splitArea: { show: false }
      },
      yAxis: {
        type: 'category',
        data: sponsorKeys,
        axisLabel: { color: isDark ? '#CBD5E1' : '#334155', width: 118, overflow: 'truncate', fontSize: 11, fontFamily: 'Inter' },
        axisTick: { show: false },
        axisLine: { show: false },
        splitArea: { show: false }
      },
      visualMap: {
        min: 1,
        max: maxVal,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemWidth: 12,
        itemHeight: 100,
        textStyle: { color: isDark ? '#94A3B8' : '#64748B', fontSize: 10, fontFamily: 'Inter' },
        inRange: {
          color: isDark
            ? ['#313695', '#4575b4', '#74add1', '#fdae61', '#f46d43', '#d73027']
            : ['#e0f3f8', '#abd9e9', '#74add1', '#fdae61', '#f46d43', '#a50026']
        }
      },
      series: [{
        type: 'heatmap',
        data: heatData,
        itemStyle: { borderColor: isDark ? '#16243A' : '#FFFFFF', borderWidth: 3, borderRadius: 4 },
        label: {
          show: true,
          formatter: p => p.value[2].toLocaleString(),
          color: isDark ? '#F1F5F9' : '#0F172A',
          fontSize: 10,
          fontWeight: 600,
          fontFamily: 'Inter'
        },
        emphasis: {
          itemStyle: {
            borderColor: '#6366F1',
            borderWidth: 2,
            shadowBlur: 10,
            shadowColor: 'rgba(99,102,241,0.4)',
          }
        }
      }]
    };
  }, [data, isDark]);

  return <ReactECharts key={theme} theme={theme} option={option} style={{ height: '100%', width: '100%' }} />;
}
