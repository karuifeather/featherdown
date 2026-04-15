import type { Plugin } from 'unified';
import type { Root } from 'hast';
import rehypeChartBlocksInternal from './internal/rehypeChartBlocksInternal.js';

/**
 * Replaces supported `chart-…` fenced JSON blocks with a mount placeholder.
 * Invalid JSON leaves the original `<pre><code>` unchanged.
 */
export const rehypeChartBlocks: Plugin<[], Root> =
  rehypeChartBlocksInternal as unknown as Plugin<[], Root>;

