/**
 * Legacy compatibility entry: the pre-`Featherdown` helper functions.
 *
 * New code should use `new Featherdown().parse(markdown)` from `featherdown`.
 * These helpers take the older `RenderMarkdownOptions` and do not get newer
 * features (math options, tabs, alerts, ...). They are supported at this path
 * and are no longer exported from the package root.
 */
export { renderMarkdown } from './renderMarkdown.js';
export { renderMarkdownDocument } from './renderMarkdownDocument.js';
export { renderMarkdownToHtml } from './renderMarkdownToHtml.js';
export { parseMarkdownFile } from './parseMarkdownFile.js';
export type { RenderMarkdownDocumentResult, RenderMarkdownOptions } from './types.js';
