/**
 * Public entry for Featherdown.
 *
 * The recommended API is the `Featherdown` class:
 *
 *   const featherdown = new Featherdown()
 *   const result = await featherdown.parse(markdown)
 *
 * Legacy helper functions remain exported for compatibility.
 * Advanced unified/processor APIs are also available from `featherdown/advanced`.
 */

/** Primary document parsing and rendering API. */
export { Featherdown } from './featherdown.js';
/** Thrown when `diagnostics: "strict"` is set and the pipeline emits warnings. */
export { FeatherdownDiagnosticsError } from './featherdownDiagnosticsError.js';

/** Shared public option, metadata, and diagnostic types. */
export type {
  FeatherdownCodeOptions,
  FeatherdownHeadingOptions,
  FeatherdownMathOptions,
  FeatherdownMetadata,
  FeatherdownOptions,
  FeatherdownParseOptions,
  FeatherdownPublishingOptions,
  FeatherdownResult,
  HeadingMetadata,
  RenderDiagnostic,
  RenderMarkdownDocumentResult,
  RenderMarkdownOptions,
  TocItem,
} from './types.js';

export { libraryId } from './libraryId.js';

/**
 * Legacy compatibility helpers.
 *
 * @deprecated Prefer `new Featherdown().parse(markdown)`.
 */
export { renderMarkdown } from './renderMarkdown.js';

/**
 * @deprecated Prefer `new Featherdown().parse(markdown)`.
 */
export { renderMarkdownDocument } from './renderMarkdownDocument.js';

/**
 * @deprecated Prefer `(await new Featherdown().parse(markdown)).html`.
 */
export { renderMarkdownToHtml } from './renderMarkdownToHtml.js';

/**
 * @deprecated Prefer `new Featherdown({ frontmatter: "auto" }).parse(markdown)`.
 */
export { parseMarkdownFile } from './parseMarkdownFile.js';

/**
 * Advanced/compatibility export.
 * Prefer importing low-level processor APIs from `featherdown/advanced`.
 */
export { createMarkdownProcessor } from './createMarkdownProcessor.js';
export { rehypeChartBlocks } from './rehypeChartBlocks.js';
export { rehypeCdnImages } from './rehypeCdnImages.js';
