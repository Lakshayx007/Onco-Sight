import * as echarts from 'echarts';

/**
 * Register ECharts themes manually.
 * The original .js files use UMD/IIFE wrappers that crash in Vite's ESM env
 * because `this` is undefined in ES modules. We extract the theme objects inline.
 */
export function registerAllThemes() {
  // ── Vintage Theme ──────────────────────────────────────────
  const vintageColors = [
    '#d87c7c', '#919e8b', '#d7ab82', '#6e7074', '#61a0a8',
    '#efa18d', '#787464', '#cc7e63', '#724e58', '#4b565b'
  ];
  echarts.registerTheme('vintage', {
    color: vintageColors,
    backgroundColor: 'transparent',
    graph: { color: vintageColors },
    textStyle: { color: '#333' },
    title: { textStyle: { color: '#333' }, subtextStyle: { color: '#999' } },
    legend: { textStyle: { color: '#555' } },
    visualMap: { textStyle: { color: '#555' } },
    categoryAxis: {
      axisLine: { lineStyle: { color: '#ccc' } },
      splitLine: { lineStyle: { color: '#eee' }, show: false },
      axisLabel: { color: '#666' }
    },
    valueAxis: {
      axisLine: { lineStyle: { color: '#ccc' } },
      splitLine: { lineStyle: { color: '#eee' } },
      axisLabel: { color: '#666' }
    },
    dataZoom: {
      textStyle: { color: '#555' },
      borderColor: '#ddd',
      fillerColor: 'rgba(216,124,124,0.15)',
      handleStyle: { color: '#d87c7c' }
    }
  });

  // ── Dark Theme (full config from dark.js) ──────────────────
  const contrastColor = '#B9B8CE';
  const darkBg = '#100C2A';
  const axisCommon = {
    axisLine: { lineStyle: { color: contrastColor } },
    splitLine: { lineStyle: { color: '#484753' } },
    splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.05)'] } },
    minorSplitLine: { lineStyle: { color: '#20203B' } },
    axisLabel: { color: contrastColor }
  };
  const darkColors = [
    '#4992ff', '#7cffb2', '#fddd60', '#ff6e76', '#58d9f9',
    '#05c091', '#ff8a45', '#8d48e3', '#dd79ff'
  ];

  const darkTheme = {
    darkMode: true,
    color: darkColors,
    backgroundColor: 'transparent',
    axisPointer: {
      lineStyle: { color: '#817f91' },
      crossStyle: { color: '#817f91' },
      label: { color: '#fff' }
    },
    legend: { textStyle: { color: contrastColor } },
    textStyle: { color: contrastColor },
    title: {
      textStyle: { color: '#EEF1FA' },
      subtextStyle: { color: '#B9B8CE' }
    },
    toolbox: { iconStyle: { borderColor: contrastColor } },
    dataZoom: {
      borderColor: '#71708A',
      textStyle: { color: contrastColor },
      brushStyle: { color: 'rgba(135,163,206,0.3)' },
      handleStyle: { color: '#353450', borderColor: '#C5CBE3' },
      moveHandleStyle: { color: '#B0B6C3', opacity: 0.3 },
      fillerColor: 'rgba(135,163,206,0.2)',
      dataBackground: {
        lineStyle: { color: '#71708A', width: 1 },
        areaStyle: { color: '#71708A' }
      },
      selectedDataBackground: {
        lineStyle: { color: '#87A3CE' },
        areaStyle: { color: '#87A3CE' }
      }
    },
    visualMap: { textStyle: { color: contrastColor } },
    timeline: {
      lineStyle: { color: contrastColor },
      label: { color: contrastColor },
      controlStyle: { color: contrastColor, borderColor: contrastColor }
    },
    calendar: {
      itemStyle: { color: darkBg },
      dayLabel: { color: contrastColor },
      monthLabel: { color: contrastColor },
      yearLabel: { color: contrastColor }
    },
    timeAxis: axisCommon,
    logAxis: axisCommon,
    valueAxis: axisCommon,
    categoryAxis: { ...axisCommon, splitLine: { ...axisCommon.splitLine, show: false } },
    line: { symbol: 'circle' },
    graph: { color: darkColors },
    gauge: { title: { color: contrastColor } },
    candlestick: {
      itemStyle: { color: '#FD1050', color0: '#0CF49B', borderColor: '#FD1050', borderColor0: '#0CF49B' }
    }
  };

  echarts.registerTheme('dark', darkTheme);
}
