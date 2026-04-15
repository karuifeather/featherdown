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

/**
 * Heading entry extracted from final rendered document structure.
 */
export type TocItem = {
  /**
   * Final heading level from 1 to 6.
   */
  depth: number;
  /**
   * Final heading text content.
   */
  text: string;
  /**
   * Final heading id used in rendered HTML.
   */
  id: string;
};

/**
 * Full render output for publishing workflows.
 */
export type RenderMarkdownDocumentResult = {
  /**
   * Sanitized rendered HTML.
   */
  html: string;
  /**
   * Non-fatal render diagnostics.
   */
  diagnostics: RenderDiagnostic[];
  /**
   * Table of contents extracted from rendered headings in document order.
   * Entries are included only when a final heading id exists.
   */
  toc: TocItem[];
  /**
   * First meaningful plain-text excerpt from rendered `p`, `blockquote`,
   * or `li` content, in document order. Returns `null` when no such content
   * exists.
   */
  excerpt: string | null;
  /**
   * Approximate plain-text word count derived from rendered document text.
   */
  wordCount: number;
  /**
   * Estimated reading time in whole minutes using a simple words-per-minute
   * heuristic. Returns 0 only when no readable text is present.
   */
  estimatedReadingMinutes: number;
};

