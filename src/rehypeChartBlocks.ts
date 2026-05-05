import type { Plugin } from 'unified';
import type { Root } from 'hast';
import rehypeChartBlocksInternal from './internal/rehypeChartBlocksInternal.js';

/**
 * Advanced rehype plugin: converts supported `chart-*` fenced JSON blocks into
 * chart mount placeholders in the output HTML tree.
 *
 * Most users should use `Featherdown`, which includes this pipeline by default.
 * Prefer importing from `featherdown/advanced` for direct rehype integration.
 */

/**
 * Replaces supported `chart-…` fenced JSON blocks with a mount placeholder.
 * Invalid JSON leaves the original `<pre><code>` unchanged.
 */
export const rehypeChartBlocks: Plugin<[], Root> =
  rehypeChartBlocksInternal as unknown as Plugin<[], Root>;

