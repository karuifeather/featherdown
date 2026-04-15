/**
 * Public browser-safe API surface for featherdown.
 *
 * This barrel module re-exports the default Markdown rendering helpers,
 * focused rehype plugins, and shared public types.
 */
export { libraryId } from './libraryId.js';
/** Parse front matter and Markdown body from a raw Markdown file. */
export { parseMarkdownFile } from './parseMarkdownFile.js';
/** Create the default browser-safe unified processor instance. */
export { createMarkdownProcessor } from './createMarkdownProcessor.js';
/** Rehype plugin that converts `chart-*` fences to mount placeholders. */
export { rehypeChartBlocks } from './rehypeChartBlocks.js';
/** Rehype plugin that adds image classes and optional CDN URL rewriting. */
export { rehypeCdnImages } from './rehypeCdnImages.js';
/** Render Markdown and return HTML plus non-fatal diagnostics. */
export { renderMarkdown } from './renderMarkdown.js';
/** Render Markdown and return HTML plus publishing metadata. */
export { renderMarkdownDocument } from './renderMarkdownDocument.js';
/** Render Markdown and return only sanitized HTML. */
export { renderMarkdownToHtml } from './renderMarkdownToHtml.js';
/** Shared public rendering option and diagnostic types. */
export type {
  RenderDiagnostic,
  RenderMarkdownDocumentResult,
  RenderMarkdownOptions,
  TocItem,
} from './types.js';
