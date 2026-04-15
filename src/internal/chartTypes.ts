/** Supported `language-chart-<type>` fence identifiers for chart placeholder blocks. */
export const CHART_BLOCK_TYPES = [
  'line',
  'bar',
  'radar',
  'doughnut',
  'pie',
  'polarArea',
  'bubble',
  'scatter',
] as const;

/** Lookup set for fast chart type membership checks. */
export const CHART_BLOCK_TYPE_SET: ReadonlySet<string> = new Set(CHART_BLOCK_TYPES);
