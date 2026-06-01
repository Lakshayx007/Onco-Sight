import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

const STATUS_PALETTE = {
  RECRUITING:              '#10B981',
  ACTIVE_NOT_RECRUITING:   '#6366F1',
  COMPLETED:               '#94A3B8',
  NOT_YET_RECRUITING:      '#F59E0B',
  TERMINATED:              '#F43F5E',
  WITHDRAWN:               '#E11D48',
  SUSPENDED:               '#EF4444',
  ENROLLING_BY_INVITATION: '#8B5CF6',
  NO_LONGER_AVAILABLE:     '#64748B',
  APPROVED_FOR_MARKETING:  '#06B6D4',
  AVAILABLE:               '#0EA5E9',
  TEMPORARILY_NOT_AVAILABLE: '#78716C',
  UNKNOWN:                 '#475569',
};

export default function StatusDonut({ data = [], theme = 'dark' }) {
  const isDark = theme === 'dark';
  const option = useMemo(() => {
    if (!data.length) return {};
    const total = data.reduce((sum, d) => sum + d.count, 0);
    return {
      backgroundColor: 'transparent',
      animationDuration: 1200,
      animationEasing: 'cubicInOut',
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark ? 'rgba(8,18,36,0.95)' : 'rgba(255,255,255,0.96)',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        borderRadius: 12,
        padding: [12, 16],
        textStyle: { color: isDark ? '#F1F5F9' : '#0F172A', fontFamily: 'Inter', fontSize: 12 },
        extraCssText: 'box-shadow: 0 8px 32px rgba(0,0,0,0.2); backdrop-filter: blur(8px);',
        formatter: p => {
          const pct = ((p.value / total) * 100).toFixed(1);
          return `<div style="font-weight:700;font-size:13px;margin-bottom:4px">${p.name}</div>` +
                 `<span style="font-size:18px;font-weight:700">${p.value.toLocaleString()}</span>` +
                 `<span style="opacity:0.6;margin-left:6px">(${pct}%)</span>`;
        }
      },
      legend: {
        orient: 'vertical',
        right: 12,
        top: 'center',
        type: 'scroll',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 10,
        icon: 'circle',
        textStyle: {
          color: isDark ? '#94A3B8' : '#64748B',
          fontSize: 11,
          fontFamily: 'Inter',
          rich: { val: { fontWeight: 600, padding: [0, 0, 0, 4] } }
        },
        formatter: name => {
          const item = data.find(d => d.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) === name);
          return item ? `${name}  {val|${item.count.toLocaleString()}}` : name;
        },
        pageIconColor: isDark ? '#94A3B8' : '#64748B',
        pageTextStyle: { color: isDark ? '#94A3B8' : '#64748B' },
      },
      series: [{
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['28%', '50%'],
        avoidLabelOverlap: true,
        padAngle: 2,
        label: { show: false },
        itemStyle: {
          borderColor: isDark ? '#16243A' : '#FFFFFF',
          borderWidth: 3,
          borderRadius: 6,
        },
        emphasis: {
          scale: true,
          scaleSize: 6,
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(0,0,0,0.25)',
          }
        },
        data: data.map(d => ({
          value: d.count,
          name: d.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        })),
      }, {
        // Center label showing total
        type: 'pie',
        radius: ['0%', '0%'],
        center: ['28%', '50%'],
        label: {
          show: true,
          position: 'center',
          formatter: [
            `{total|${total.toLocaleString()}}`,
            '{label|trials}'
          ].join('\n'),
          rich: {
            total: {
              color: isDark ? '#F1F5F9' : '#0F172A',
              fontSize: 24,
              fontWeight: 800,
              fontFamily: 'Inter',
              lineHeight: 32,
            },
            label: {
              color: isDark ? '#94A3B8' : '#64748B',
              fontSize: 12,
              fontFamily: 'Inter',
              lineHeight: 20,
            }
          }
        },
        labelLine: { show: false },
        data: [{ value: 0, name: '' }],
        silent: true,
        animation: false
      }]
    };
  }, [data, isDark]);

  return <ReactECharts key={theme} theme={theme} option={option} style={{ height: '100%', width: '100%' }} />;
}
