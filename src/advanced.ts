/**
 * Advanced entry: low-level unified processor factory and focused rehype plugins.
 *
 * Use this subpath when integrating Featherdown’s pipeline into custom unified
 * or rehype workflows. Most applications should use the `Featherdown` class from
 * `featherdown` instead.
 *
 * The same symbols remain re-exported from the package root for compatibility;
 * this path makes advanced integrations explicit in imports.
 */
export { createMarkdownProcessor } from './createMarkdownProcessor.js';
export { rehypeChartBlocks } from './rehypeChartBlocks.js';
export { rehypeCdnImages } from './rehypeCdnImages.js';
