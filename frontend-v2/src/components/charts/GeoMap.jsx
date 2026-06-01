import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import worldGeoJson from '../../world.json';

echarts.registerMap('world', worldGeoJson);

export default function GeoMap({ data = [], theme = 'dark' }) {
  const isDark = theme === 'dark';
  const option = useMemo(() => {
    const mapData = data.map(d => ({
      name: d.country === 'United States' ? 'United States of America' : d.country,
      value: d.trial_count
    }));
    const max = mapData.length ? Math.max(...mapData.map(m => m.value)) : 100;

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
          if (p.value == null) return `<div style="font-weight:600">${p.name}</div><span style="opacity:0.6">No trials recorded</span>`;
          return `<div style="font-weight:700;font-size:13px;margin-bottom:4px">${p.name}</div>` +
                 `<span style="font-size:18px;font-weight:700;color:${isDark ? '#34D399' : '#059669'}">${p.value.toLocaleString()}</span>` +
                 `<span style="opacity:0.6;margin-left:6px">trials</span>`;
        }
      },
      visualMap: {
        left: 16,
        bottom: 24,
        min: 0,
        max,
        calculable: true,
        text: ['High', 'Low'],
        textStyle: { color: isDark ? '#94A3B8' : '#64748B', fontFamily: 'Inter', fontSize: 11 },
        inRange: {
          color: isDark
            ? ['#1e1b4b', '#4338ca', '#8b5cf6', '#ec4899', '#f43f5e']
            : ['#e0e7ff', '#818cf8', '#a855f7', '#f472b6', '#f43f5e']
        },
        itemWidth: 14,
        itemHeight: 120,
        borderRadius: 8,
      },
      series: [{
        name: 'Trials',
        type: 'map',
        map: 'world',
        roam: true,
        zoom: 1.2,
        scaleLimit: { min: 1, max: 8 },
        itemStyle: {
          areaColor: 'transparent',
          borderColor: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.15)',
          borderWidth: 0.5
        },
        emphasis: {
          label: { show: true, color: isDark ? '#F1F5F9' : '#0F172A', fontWeight: 600, fontSize: 11 },
          itemStyle: {
            areaColor: isDark ? '#6366F1' : '#818CF8',
            shadowColor: 'rgba(99,102,241,0.4)',
            shadowBlur: 16,
          }
        },
        select: {
          label: { show: true },
          itemStyle: { areaColor: '#6366F1' }
        },
        data: mapData,
        animationDurationUpdate: 800,
      }]
    };
  }, [data, isDark]);

  return <ReactECharts key={theme} theme={theme} option={option} style={{ height: '100%', width: '100%' }} />;
}
