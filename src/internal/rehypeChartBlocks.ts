import { toText } from 'hast-util-to-text';
import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import { CHART_BLOCK_TYPE_SET } from './chartTypes.js';
import type { DiagnosticEmitter } from './diagnostics.js';

const LANG_PREFIX = 'language-chart-';

function chartTypeFromClassName(className: unknown): string | undefined {
  const list = Array.isArray(className)
    ? className
    : typeof className === 'string'
      ? [className]
      : [];
  for (const c of list) {
    if (typeof c === 'string' && c.startsWith(LANG_PREFIX)) {
      return c.slice(LANG_PREFIX.length);
    }
  }
  return undefined;
}

/**
 * Turns ` ```chart-<type> ` fenced JSON into a mount placeholder `div`.
 * Invalid JSON leaves the original `<pre><code>` unchanged.
 */
const rehypeChartBlocks: Plugin<
  [{ emitDiagnostic?: DiagnosticEmitter }?],
  Root
> = function rehypeChartBlocks(options) {
  const emitDiagnostic = options?.emitDiagnostic;
  return (tree): undefined => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'pre') return;
      if (!parent || typeof index !== 'number') return;
      const code = node.children[0];
      if (!code || code.type !== 'element' || code.tagName !== 'code') return;

      const chartType = chartTypeFromClassName(code.properties.className);
      if (!chartType || !CHART_BLOCK_TYPE_SET.has(chartType)) return;

      const raw = toText(code, { whitespace: 'pre' }).trim();
      try {
        const parsed: unknown = JSON.parse(raw);
        const jsonStr = JSON.stringify(parsed);
        const div: Element = {
          type: 'element',
          tagName: 'div',
          properties: {
            className: ['chart-mount'],
            dataChart: chartType,
            dataChartData: jsonStr,
          },
          children: [],
        };
        parent.children[index] = div;
      } catch {
        emitDiagnostic?.({
          code: 'chart.invalid_json',
          message: `Chart JSON could not be parsed for type "${chartType}".`,
          severity: 'warning',
          source: 'chart',
        });
        /* keep original pre/code */
      }
    });
  };
};

export default rehypeChartBlocks;
