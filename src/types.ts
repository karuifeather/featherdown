import type { PluggableList } from 'unified';

/**
 * Shared public type definitions for featherdown rendering APIs.
 *
 * This module documents option and diagnostic shapes used by browser-safe
 * entrypoints.
 */

/**
 * Manifest entry for one image. `width` / `height` (intrinsic pixels), when
 * present, are emitted on the `<img>` to prevent layout shift.
 */
export type ManifestImageEntry = {
  url: string;
  width?: number;
  height?: number;
};

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
    map?: Record<string, ManifestImageEntry>;
    /**
     * Mapping for remote source URLs that should be replaced.
     */
    remote?: Record<string, ManifestImageEntry>;
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
  source: 'chart' | 'images' | 'embeds' | 'code' | 'links' | 'math' | 'tabs';
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
 * Rich heading metadata extracted from final rendered document structure.
 */
export type HeadingMetadata = {
  /**
   * Zero-based heading index in document order among included headings.
   */
  index: number;
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
  /**
   * Whether the heading id comes from explicit `{#custom-id}` syntax.
   */
  hasCustomId: boolean;
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
   * Rich heading metadata in document order.
   * Entries are included only when a final heading id exists.
   */
  headings: HeadingMetadata[];
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

/**
 * Math rendering intent for {@link Featherdown}.
 */
export type FeatherdownMathOptions = {
  enabled?: boolean;
  /**
   * KaTeX macros, for example `{ "\\R": "\\mathbb{R}" }`. Keys start with a
   * backslash. Each parse works on its own copy, so `\gdef` in one document
   * never leaks into another. Constructor and per-parse macros are merged
   * (per-parse wins on a key conflict).
   */
  macros?: Record<string, string>;
  /**
   * Allow KaTeX's HTML-extension commands (`\href`, `\url`, `\includegraphics`,
   * `\htmlClass`, `\htmlId`, `\htmlStyle`, `\htmlData`). KaTeX output is added
   * **after** sanitization, so `true` lets math author arbitrary links, ids,
   * classes and inline styles. Use it for trusted content only. Default `false`;
   * while it is off, each blocked command is reported as a `math.trust` diagnostic.
   */
  trust?: boolean;
  /**
   * How KaTeX treats input that is valid but not strict LaTeX (for example
   * Unicode text in math mode). `"ignore"` (default) stays silent, `"warn"`
   * reports a `math.strict` diagnostic, `"error"` (or `true`) reports a
   * `math.render` diagnostic. The equation renders either way, so use these
   * with `diagnostics: "strict"` to fail a build on non-strict LaTeX.
   * `false` is `"ignore"`.
   */
  strict?: boolean | 'ignore' | 'warn' | 'error';
};

/**
 * Code block pipeline intent for {@link Featherdown}.
 */
export type FeatherdownCodeOptions = {
  enabled?: boolean;
  highlighting?: boolean;
  /** Default `showLineNumbers` for every fence (a fence can still opt in itself). Default `false`. */
  lineNumbers?: boolean;
  /** Default copy-button markup for every fence (a fence can still opt in itself). Default `false`. */
  copyButton?: boolean;
};

/**
 * Heading metadata options for {@link Featherdown}. Heading ids and anchor links
 * are always rendered; `toc: false` empties `result.toc` while keeping
 * `result.headings`.
 */
export type FeatherdownHeadingOptions = {
  toc?: boolean;
  /** Shallowest heading level included in `toc` / `tocTree` (default 1). `headings` is unaffected. */
  minDepth?: number;
  /** Deepest heading level included in `toc` / `tocTree` (default 6). `headings` is unaffected. */
  maxDepth?: number;
};

/**
 * Nested table-of-contents node: headings nested under the nearest shallower heading.
 */
export type TocTreeItem = TocItem & {
  children: TocTreeItem[];
};

/**
 * External link handling. Applies to absolute `http(s)` links whose host is not
 * in `internalHosts`.
 */
export type FeatherdownLinkOptions = {
  /** `rel` for external links (default `"noopener noreferrer"`); `false` leaves `rel` alone. */
  rel?: string | false;
  /** `target` for external links (default `"_blank"`); `false` leaves `target` alone. */
  target?: string | false;
  /** Hostnames treated as internal (exact match, or `*.example.com` wildcards). */
  internalHosts?: string[];
};

/**
 * Image output options.
 */
export type FeatherdownImageOptions = {
  /** Add `loading="lazy"` (default `true`). */
  lazy?: boolean;
  /** Add `decoding` (default `"async"`); `false` omits it. */
  decoding?: 'async' | 'sync' | 'auto' | false;
  /**
   * Wrap a paragraph containing only one titled image in
   * `<figure class="markdown-figure">` with a `<figcaption>` from the title (default `false`).
   */
  figure?: boolean;
};

/**
 * Built-in embed providers for allowlisted `<iframe>`s and `::embed` directives.
 */
export type FeatherdownEmbedProvider = 'youtube' | 'vimeo' | 'codepen' | 'codesandbox' | 'stackblitz';

/**
 * Embed options. Iframes are dropped unless their `src` matches an allowed provider or host.
 */
export type FeatherdownEmbedOptions = {
  /** Built-in providers to allow (default: all built-in providers). */
  providers?: FeatherdownEmbedProvider[];
  /** Extra `https` hostnames to allow (exact, or `*.example.com`). */
  allowHosts?: string[];
};

/**
 * Extra unified plugins. `remark` plugins run after Featherdown's remark stage
 * and before HTML conversion, so their output is still sanitized. `rehype`
 * plugins run after every Featherdown stage, right before serialization, and
 * are **not** sanitized: treat them as trusted code.
 */
export type FeatherdownPlugins = {
  remark?: PluggableList;
  rehype?: PluggableList;
};

/**
 * Publishing metadata fields returned from {@link Featherdown.parse}.
 */
export type FeatherdownPublishingOptions = {
  excerpt?: boolean;
  wordCount?: boolean;
  readingTime?: boolean;
};

/**
 * Well-known document metadata derived from YAML front matter when present.
 */
export type FeatherdownMetadata = {
  title?: string;
  description?: string;
  date?: string;
  updated?: string;
  status?: string;
  tags?: string[];
  author?: string;
  /** `draft: true` in front matter (or `status: draft`). */
  draft?: boolean;
  categories?: string[];
  /** Cover / social image (`image`, `cover`, or `ogImage`). */
  image?: string;
  canonical?: string;
  slug?: string;
  lang?: string;
  keywords?: string[];
};

/**
 * Options for {@link Featherdown} construction: legacy manifest fields plus
 * user-intent toggles.
 */
export type FeatherdownOptions = RenderMarkdownOptions & {
  /**
   * When `true` or `"auto"`, parse leading YAML front matter when present and
   * render only the body. When `false` or omitted, pass the full string through.
   */
  frontmatter?: false | true | 'auto';
  math?: boolean | FeatherdownMathOptions;
  code?: boolean | FeatherdownCodeOptions;
  sanitize?: boolean;
  /**
   * `false`: hide diagnostics on the result (`[]`). `true` and `"warn"`: collect
   * diagnostics, never throw. `"strict"`: collect diagnostics; throw
   * `FeatherdownDiagnosticsError` if any were produced.
   */
  diagnostics?: boolean | 'warn' | 'strict';
  charts?: boolean;
  headings?: boolean | FeatherdownHeadingOptions;
  publishing?: boolean | FeatherdownPublishingOptions;
  /** GitHub-style alerts (`> [!NOTE]`) rendered as callouts. Default `true`. */
  alerts?: boolean;
  /** `:::details[Summary]` collapsible sections. Default `true`. */
  details?: boolean;
  /**
   * `H~2~O` and `x^2^` render as `<sub>` and `<sup>`. Content between the marks
   * cannot contain whitespace. Because `~x~` now means subscript, only the
   * double-tilde `~~x~~` form is strikethrough. Default `true`.
   */
  subSuperscript?: boolean;
  /** `Term` followed by `: Definition` lines render as `<dl>`. Default `true`. */
  definitionLists?: boolean;
  /**
   * `::::tabs` containing `:::tab[Label]` panels. Output is semantic markup
   * (tablist, tabs, panels) with no behavior; see the README for wiring it up.
   * Default `true`.
   */
  tabs?: boolean;
  /** External link `rel` / `target`. Default `false` (opt in). */
  links?: boolean | FeatherdownLinkOptions;
  /** Lazy loading, decoding and figure captions. Default `false` (opt in). */
  images?: boolean | FeatherdownImageOptions;
  /** Allowlisted iframes and `::embed` directives. Default `false` (opt in). */
  embeds?: boolean | FeatherdownEmbedOptions;
  /** Extra remark / rehype plugins. */
  plugins?: FeatherdownPlugins;
};

/**
 * Per-call options for {@link Featherdown.parse}. Same shape as {@link FeatherdownOptions}.
 */
export type FeatherdownParseOptions = FeatherdownOptions;

/**
 * Stable public contract for {@link Featherdown.parse} output: rendered document
 * fields plus `body`, placeholders, `stats`, and `assets`. `excerpt` is always
 * `string | null` after publishing gates (may be `null` when excerpt is disabled
 * or when the document has no suitable excerpt).
 */
export type FeatherdownResult = RenderMarkdownDocumentResult & {
  excerpt: string | null;
  /**
   * Markdown body after front matter is removed when front matter parsing is enabled
   * and a valid block exists; otherwise the full input string.
   */
  body: string;
  /**
   * Parsed YAML front matter object, or `{}` when absent or when parsing is disabled.
   */
  frontmatter: Record<string, unknown>;
  /**
   * Typed subset of front matter for common publishing fields.
   */
  metadata: FeatherdownMetadata;
  /** Nested table of contents built from `toc` (empty when `toc` is empty). */
  tocTree: TocTreeItem[];
  stats: {
    wordCount: number;
    readingTimeMinutes: number;
  };
  assets: {
    styles: string[];
    scripts: string[];
    features: {
      math: boolean;
      code: boolean;
      charts: boolean;
      mermaid: boolean;
      embeds: boolean;
      tabs: boolean;
    };
  };
};

