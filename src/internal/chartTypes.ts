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

export const CHART_BLOCK_TYPE_SET: ReadonlySet<string> = new Set(CHART_BLOCK_TYPES);
