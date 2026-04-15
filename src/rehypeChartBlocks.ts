import type { Plugin } from 'unified';
import type { Root } from 'hast';
import rehypeChartBlocksInternal from './internal/rehypeChartBlocksInternal.js';

/**
 * Rehype plugin entrypoint for chart code fence transformations.
 *
 * Exports a plugin that converts supported `chart-*` fenced JSON blocks into
 * chart mount placeholders in the output HTML tree.
 */

/**
 * Replaces supported `chart-…` fenced JSON blocks with a mount placeholder.
 * Invalid JSON leaves the original `<pre><code>` unchanged.
 */
export const rehypeChartBlocks: Plugin<[], Root> =
  rehypeChartBlocksInternal as unknown as Plugin<[], Root>;

