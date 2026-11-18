/**
 * Legacy compatibility entry: the pre-`Featherdown` helper functions.
 *
 * New code should use `new Featherdown().parse(markdown)` from `featherdown`.
 * These helpers are also still re-exported (deprecated) from the package root
 * for one more minor release; import them from `featherdown/legacy` to keep
 * working after the root re-exports are removed.
 */
export { renderMarkdown } from './renderMarkdown.js';
export { renderMarkdownDocument } from './renderMarkdownDocument.js';
export { renderMarkdownToHtml } from './renderMarkdownToHtml.js';
export { parseMarkdownFile } from './parseMarkdownFile.js';
export type { RenderMarkdownDocumentResult, RenderMarkdownOptions } from './types.js';
