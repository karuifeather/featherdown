import type { Plugin } from 'unified';
import type { Root } from 'hast';
import type { RenderMarkdownOptions } from './types.js';
import rehypeCdnImagesInternal from './internal/rehypeCdnImagesInternal.js';

/**
 * Advanced rehype plugin: annotates images and can rewrite `src` using
 * caller-provided manifest mappings.
 *
 * Most users should use `Featherdown`, which includes this pipeline by default.
 * Prefer importing from `featherdown/advanced` for direct rehype integration.
 */

/**
 * Options accepted by `rehypeCdnImages`.
 */
export type RehypeCdnImagesOptions = RenderMarkdownOptions;

/**
 * Adds `markdown-inline-img` to all images and optionally rewrites `src` using
 * caller-provided manifest data.
 */
export const rehypeCdnImages: Plugin<[RehypeCdnImagesOptions?], Root> =
  rehypeCdnImagesInternal as unknown as Plugin<[RehypeCdnImagesOptions?], Root>;

