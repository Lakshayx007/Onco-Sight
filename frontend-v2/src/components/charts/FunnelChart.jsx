import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';



export default function FunnelChart({ data = [], theme = 'dark', onPhaseClick }) {
  const isDark = theme === 'dark';
  const option = useMemo(() => {
    const funnelData = data.map((d, i) => ({
      value: d.unique_trials,
      name: d.phase,
    }));

    return {
      backgroundColor: 'transparent',
      animationDuration: 1000,
      animationEasing: 'cubicInOut',
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark ? 'rgba(8,18,36,0.95)' : 'rgba(255,255,255,0.96)',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        borderRadius: 12,
        padding: [12, 16],
        textStyle: {
          color: isDark ? '#F1F5F9' : '#0F172A',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 12,
        },
        extraCssText: 'box-shadow: 0 8px 32px rgba(0,0,0,0.2); backdrop-filter: blur(8px);',
        formatter: (p) => {
          const d = data.find(row => row.phase === p.name);
          if (!d) return `${p.name}: ${p.value} trials`;
          const delta = d.attrition_pct == null ? '' : `<br/><span style="color:${d.attrition_pct < 0 ? '#10B981' : '#F43F5E'}">▸ ${d.attrition_pct}% vs prior phase</span>`;
          return `<div style="font-weight:700;font-size:13px;margin-bottom:6px">${d.phase}</div>` +
                 `<div style="display:grid;grid-template-columns:auto auto;gap:2px 12px;font-size:11px">` +
                 `<span style="opacity:0.7">Trials</span><span style="font-weight:600">${d.unique_trials.toLocaleString()}</span>` +
                 `<span style="opacity:0.7">Assets</span><span style="font-weight:600">${d.distinct_drugs.toLocaleString()}</span>` +
                 `<span style="opacity:0.7">Enrollment</span><span style="font-weight:600">${d.total_enrollment.toLocaleString()}</span>` +
                 `</div>${delta}`;
        }
      },
      series: [{
        name: 'Trials by Phase',
        type: 'funnel',
        left: '8%',
        top: 16,
        bottom: 20,
        width: '84%',
        min: 0,
        minSize: '12%',
        maxSize: '100%',
        sort: 'descending',
        gap: 4,
        label: {
          show: true,
          position: 'right',
          formatter: (p) => {
            const d = data.find(row => row.phase === p.name);
            return d ? `{name|${d.phase}}\n{val|${d.unique_trials.toLocaleString()} trials}` : p.name;
          },
          rich: {
            name: { color: isDark ? '#F1F5F9' : '#0F172A', fontWeight: 700, fontSize: 12, lineHeight: 20, fontFamily: 'Inter' },
            val: { color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, lineHeight: 18, fontFamily: 'Inter' },
          }
        },
        labelLine: { show: true, length: 20, lineStyle: { color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' } },
        itemStyle: {
          borderColor: isDark ? 'rgba(11,22,40,0.6)' : 'rgba(255,255,255,0.6)',
          borderWidth: 2,
        },
        emphasis: {
          label: { fontSize: 13, fontWeight: 700 },
          itemStyle: { shadowBlur: 12, shadowColor: 'rgba(99,102,241,0.4)' }
        },
        data: funnelData
      }]
    };
  }, [data, isDark]);

  const onEvents = {
    click: (params) => { if (onPhaseClick) onPhaseClick(params.name); }
  };

  return <ReactECharts key={theme} theme={theme} option={option} onEvents={onEvents} style={{ height: '100%', width: '100%' }} />;
}
