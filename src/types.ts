/**
 * Shared public type definitions for featherdown rendering APIs.
 *
 * This module documents option and diagnostic shapes used by browser-safe
 * entrypoints.
 */

/**
 * Options for Markdown rendering and image URL rewriting.
 */
export type RenderMarkdownOptions = {
  /**
   * Content kind used in generated manifest lookup keys (for example `post`).
   */
  kind?: string;
  /**
   * Content slug used in generated manifest lookup keys.
   */
  slug?: string;
  /**
   * Optional manifest mapping local or remote image paths to CDN URLs.
   */
  manifest?: {
    /**
     * Mapping for local path keys such as `post/my-slug/images/logo.png`.
     */
    map?: Record<string, { url: string }>;
    /**
     * Mapping for remote source URLs that should be replaced.
     */
    remote?: Record<string, { url: string }>;
  };
};

/**
 * Non-fatal issue emitted during rendering.
 */
export type RenderDiagnostic = {
  /**
   * Stable machine-readable code for the warning.
   */
  code: string;
  /**
   * Human-readable warning text.
   */
  message: string;
  /**
   * Diagnostic severity level.
   */
  severity: 'warning';
  /**
   * Pipeline component that emitted the diagnostic.
   */
  source: 'chart' | 'images';
};

