/**
 * Public entry for Featherdown.
 *
 * The recommended API is the `Featherdown` class:
 *
 *   const featherdown = new Featherdown()
 *   const result = await featherdown.parse(markdown)
 *
 * Legacy helper functions remain exported (deprecated) for compatibility and are
 * also available from `featherdown/legacy`.
 * Advanced unified/processor APIs are also available from `featherdown/advanced`.
 */

import { createMarkdownProcessor as createMarkdownProcessorImpl } from './createMarkdownProcessor.js';
import { rehypeCdnImages as rehypeCdnImagesImpl } from './rehypeCdnImages.js';
import { rehypeChartBlocks as rehypeChartBlocksImpl } from './rehypeChartBlocks.js';

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
 * Legacy compatibility helpers. Also available from `featherdown/legacy`, which
 * is where they will live once these root re-exports are removed.
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
 * @deprecated Import from `featherdown/advanced`; the root re-export will be removed.
 */
export const createMarkdownProcessor: typeof createMarkdownProcessorImpl = createMarkdownProcessorImpl;

/**
 * @deprecated Import from `featherdown/advanced`; the root re-export will be removed.
 */
export const rehypeChartBlocks: typeof rehypeChartBlocksImpl = rehypeChartBlocksImpl;

/**
 * @deprecated Import from `featherdown/advanced`; the root re-export will be removed.
 */
export const rehypeCdnImages: typeof rehypeCdnImagesImpl = rehypeCdnImagesImpl;
