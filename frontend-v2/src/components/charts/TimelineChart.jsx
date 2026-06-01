import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

const PHASE_ORDER = ['Early Phase 1', 'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'];

const PHASE_COLORS_DARK = {
  'Early Phase 1': [['#4ECDC4', 'rgba(78,205,196,0.08)']],
  'Phase 1':       [['#10B981', 'rgba(16,185,129,0.08)']],
  'Phase 2':       [['#6366F1', 'rgba(99,102,241,0.08)']],
  'Phase 3':       [['#A855F7', 'rgba(168,85,247,0.08)']],
  'Phase 4':       [['#F59E0B', 'rgba(245,158,11,0.08)']],
};
const PHASE_COLORS_LIGHT = {
  'Early Phase 1': [['#14B8A6', 'rgba(20,184,166,0.06)']],
  'Phase 1':       [['#059669', 'rgba(5,150,105,0.06)']],
  'Phase 2':       [['#4F46E5', 'rgba(79,70,229,0.06)']],
  'Phase 3':       [['#9333EA', 'rgba(147,51,234,0.06)']],
  'Phase 4':       [['#D97706', 'rgba(217,119,6,0.06)']],
};

export default function TimelineChart({ data = [], theme = 'dark' }) {
  const isDark = theme === 'dark';
  const option = useMemo(() => {
    if (!data.length) return {};
    const years = data.map(d => d.year);
    const palette = isDark ? PHASE_COLORS_DARK : PHASE_COLORS_LIGHT;

    return {
      backgroundColor: 'transparent',
      animationDuration: 1200,
      animationEasing: 'cubicInOut',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          lineStyle: { color: isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.3)' },
          crossStyle: { color: isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.3)' },
        },
        backgroundColor: isDark ? 'rgba(8,18,36,0.95)' : 'rgba(255,255,255,0.96)',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        borderRadius: 12,
        padding: [12, 16],
        textStyle: { color: isDark ? '#F1F5F9' : '#0F172A', fontFamily: 'Inter', fontSize: 11 },
        extraCssText: 'box-shadow: 0 8px 32px rgba(0,0,0,0.2); backdrop-filter: blur(8px);',
      },
      legend: {
        top: 4,
        data: PHASE_ORDER,
        textStyle: { color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontFamily: 'Inter' },
        itemWidth: 14,
        itemHeight: 8,
        itemGap: 16,
        icon: 'roundRect',
      },
      grid: { left: 52, right: 30, top: 48, bottom: 74 },
      xAxis: {
        type: 'category',
        data: years,
        boundaryGap: false,
        axisLabel: { color: isDark ? '#94A3B8' : '#64748B', fontFamily: 'Inter', fontSize: 11 },
        axisLine: { lineStyle: { color: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(0,0,0,0.08)' } },
      },
      yAxis: {
        type: 'value',
        name: 'New trials',
        nameTextStyle: { color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600, fontFamily: 'Inter', fontSize: 11 },
        axisLabel: { color: isDark ? '#94A3B8' : '#64748B', fontFamily: 'Inter', fontSize: 11 },
        splitLine: { lineStyle: { color: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(0,0,0,0.06)', type: 'dashed' } }
      },
      dataZoom: [
        {
          type: 'slider', start: 40, end: 100, height: 22, bottom: 16,
          borderColor: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.1)',
          backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(241,245,249,0.8)',
          fillerColor: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)',
          handleStyle: { color: '#6366F1', borderColor: '#6366F1' },
          textStyle: { color: isDark ? '#94A3B8' : '#64748B', fontSize: 10 },
          dataBackground: {
            lineStyle: { color: isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)' },
            areaStyle: { color: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)' }
          },
          selectedDataBackground: {
            lineStyle: { color: '#6366F1' },
            areaStyle: { color: 'rgba(99,102,241,0.15)' }
          }
        },
        { type: 'inside' }
      ],
      series: PHASE_ORDER.map(phase => {
        const [line, areaBase] = (palette[phase] || [['#6366F1', 'rgba(99,102,241,0.08)']])[0];
        return {
          name: phase,
          type: 'line',
          stack: 'total',
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: line.replace(')', ',0.35)').replace('rgb', 'rgba') || areaBase },
              { offset: 1, color: 'rgba(0,0,0,0)' }
            ]),
          },
          smooth: 0.35,
          symbol: 'circle',
          symbolSize: 0,
          showSymbol: false,
          emphasis: {
            focus: 'series',
            itemStyle: { borderWidth: 2, borderColor: '#fff', shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.2)' }
          },
          lineStyle: { width: 2.5, color: line },
          itemStyle: { color: line },
          data: data.map(d => d[phase] || 0)
        };
      })
    };
  }, [data, isDark]);

  return <ReactECharts key={theme} theme={theme} option={option} style={{ height: '100%', width: '100%' }} />;
}
