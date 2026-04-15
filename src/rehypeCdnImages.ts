import type { Plugin } from 'unified';
import type { Root } from 'hast';
import type { RenderMarkdownOptions } from './types.js';
import rehypeCdnImagesInternal from './internal/rehypeCdnImagesInternal.js';

export type RehypeCdnImagesOptions = RenderMarkdownOptions;

/**
 * Adds `markdown-inline-img` to all images and optionally rewrites `src` using
 * caller-provided manifest data.
 */
export const rehypeCdnImages: Plugin<[RehypeCdnImagesOptions?], Root> =
  rehypeCdnImagesInternal as unknown as Plugin<[RehypeCdnImagesOptions?], Root>;

