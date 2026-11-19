/**
 * Public entry for Featherdown.
 *
 * Use the `Featherdown` class:
 *
 *   const featherdown = new Featherdown()
 *   const result = await featherdown.parse(markdown)
 *
 * Other entry points:
 * - `featherdown/node`: the same class with optional Node-only Mermaid rendering.
 * - `featherdown/advanced`: the low-level unified processor and rehype plugins.
 * - `featherdown/legacy`: the pre-`Featherdown` helper functions.
 */

/** Primary document parsing and rendering API. */
export { Featherdown } from './featherdown.js';
/** Thrown when `diagnostics: "strict"` is set and the pipeline emits warnings. */
export { FeatherdownDiagnosticsError } from './featherdownDiagnosticsError.js';

/** Shared public option, metadata, and diagnostic types. */
export type {
  FeatherdownCodeOptions,
  FeatherdownEmbedOptions,
  FeatherdownEmbedProvider,
  FeatherdownHeadingOptions,
  FeatherdownImageOptions,
  FeatherdownLinkOptions,
  FeatherdownMathOptions,
  FeatherdownMetadata,
  FeatherdownOptions,
  FeatherdownParseOptions,
  FeatherdownPlugins,
  FeatherdownPublishingOptions,
  FeatherdownResult,
  HeadingMetadata,
  RenderDiagnostic,
  RenderMarkdownDocumentResult,
  RenderMarkdownOptions,
  TocItem,
  TocTreeItem,
} from './types.js';

export { libraryId } from './libraryId.js';
