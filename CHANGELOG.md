# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [1.0.0] - 2026-11-18

First stable release. From here the public API follows semantic versioning; see **Stability and versioning** in the README for what that covers.

### Removed

- **Breaking:** the deprecated root re-exports `renderMarkdown`, `renderMarkdownDocument`, `renderMarkdownToHtml`, `parseMarkdownFile`, `createMarkdownProcessor`, `rehypeChartBlocks`, and `rehypeCdnImages`. The root now exports `Featherdown`, `FeatherdownDiagnosticsError`, `libraryId`, and types. Import the helpers from `featherdown/legacy` and the processor and plugins from `featherdown/advanced`.
- **Breaking (JSR):** the extra JSR subpaths `./parseMarkdownFile`, `./createMarkdownProcessor`, `./rehypeChartBlocks`, `./rehypeCdnImages`, `./renderMarkdown`, `./renderMarkdownToHtml`, and `./libraryId`. JSR now exposes the same four entry points as npm (`.`, `./node`, `./advanced`, `./legacy`), and a test keeps the two in step.

### Added

- `math` options: `macros` (merged between constructor and per-call options; each parse gets its own copy, so `\gdef` cannot leak between documents), `trust` (default `false`), and `strict` (`"ignore"` by default, `"warn"`, `"error"`).
- Math problems are reported as diagnostics with source `math`: `math.render` (an equation KaTeX cannot render), `math.strict` and `math.trust` (a blocked `\href`, `\htmlStyle`, ...). `diagnostics: "strict"` now fails a build on broken math.
- `subSuperscript` option (default on): `H~2~O` renders `<sub>`, `x^2^` renders `<sup>`.
- `definitionLists` option (default on): `Term` then `: Definition` renders `<dl>`.
- `tabs` option (default on): `::::tabs` containing `:::tab[Label]` renders a tablist, tab buttons and panels with ARIA wiring and no behavior. The README has a small script to switch panels. Adds the `tabs.invalid` diagnostic and `assets.features.tabs`.
- `base.css` styles for tabs (every panel is shown under its label until a group has `data-tabs-ready`) and for definition lists.
- README: a **Stability and versioning** section.
- `RenderDiagnostic.source` now includes `"math"` and `"tabs"`.

### Changed

- **Behavior:** with `subSuperscript` on (the default), single-tilde `~x~` is subscript instead of GFM strikethrough. `~~x~~` still strikes through. Set `subSuperscript: false` for the old behavior.
- **Behavior:** KaTeX `strict` no longer logs to the console. Strictness warnings were silenced by default (`"ignore"`); use `math: { strict: "warn" }` to get them as diagnostics.

### Fixed

- Text such as `10:30` or `:smile:` no longer loses characters. remark-directive read `:30` as an inline directive, which rendered as an empty element. Inline directives are now restored to the text they were written as (this also applies to the legacy helpers).

## [0.5.1] - 2026-11-18

### Documentation

- README restructured for learning: defaults table, gotchas, diagnostics reference.

### Fixed

- Dark mode: `highlight.css` is now an owned GitHub-palette theme with a dark variant (`--fd-hl-*` variables) instead of importing highlight.js's light-only GitHub theme, which made token colors hard to read and painted white boxes behind fences without a title. Bare fenced code blocks are now styled by `code.css`.
- Code lines no longer lose the space between adjacent tokens (`const s` rendered as `consts`); `.code-line` is `inline-block` instead of `inline-flex`.
- Callouts and `:::details` no longer add extra space after their last child or between the callout title and body.
- `code.css` no longer stacks highlight.js's `pre code.hljs { padding: 1em }` on top of the code block's own padding, which left uneven extra space inside fenced code blocks.

## [0.5.0] - 2026-11-18

### Fixed

- Code line highlights `{n}`, line numbers and `diff` lines now work with `code: { highlighting: false }`.
- GitHub alert titles keep inline-formatted text (`> [!NOTE] **Heads up**`).
- Footnote references always link to the footnote, even when a heading slug matches the footnote id.
- Footnote links no longer receive a doubled `user-content-` prefix, so every `#fragment` to a footnote resolves.
- Node Mermaid output no longer re-prefixes every id in the document. Only the Mermaid SVG is re-sanitized, and Node output matches the browser entry for non-Mermaid content.
- The footnotes heading is excluded from `toc` and `headings`.
- Footnote markers and gaps are stripped from `excerpt`, and the excerpt is never taken from the footnotes section.
- An author id that the sanitizer would prefix into a footnote id (`## Top {#fn-1}`, `<div id="fnref-1">`) is renamed with a numeric suffix (`user-content-fn-1-1`), so ids stay unique. `toc` and `headings` report the renamed id. Author links written as `#fn-1` still go to the footnote.
- Highlighted code lines split correctly when a syntax token spans several lines (block comments, template literals). Each line gets its own `code-line` wrapper with the token's classes, so line highlights, line numbers and `diff` classes stay aligned.
- Unquoted YAML dates in front matter are no longer dropped from `metadata`. They are normalized to `YYYY-MM-DD`.

### Added

- GitHub-style alerts (`> [!NOTE]`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION`) render as callouts, with an optional custom title on the marker line. Enabled by default (`alerts`).
- `:::details[Summary]{open}` collapsible sections. Enabled by default (`details`).
- `links` option: `rel`, `target`, and `internalHosts` for external links. Opt in. Wildcard hosts (`*.example.com`) match subdomains only.
- `images` option: `lazy`, `decoding`, and `figure` (`<figure class="markdown-figure">` with a `<figcaption>` from the image title). Opt in.
- `embeds` option: allowlisted iframes and `::youtube`, `::vimeo`, and `::embed` directives for YouTube, Vimeo, CodePen, CodeSandbox, and StackBlitz, plus `allowHosts` for extra third-party hosts. Opt in. Output is wrapped in `div.embed.embed-<provider>`, and iframes are hardened (sandbox, `loading="lazy"`, `referrerpolicy`). Adds `embeds.blocked` and `embeds.invalid` diagnostics.
- `plugins` option: `remark` and `rehype` plugin lists. Remark output is still sanitized. Rehype plugins run after sanitization and are trusted.
- `headings.minDepth` and `headings.maxDepth` filter `toc` and `tocTree`. `headings` is unaffected.
- `tocTree` result field: `toc` entries nested under the nearest shallower heading.
- `assets.features.embeds` result flag.
- Exported types for the new options and results: `FeatherdownLinkOptions`, `FeatherdownImageOptions`, `FeatherdownEmbedOptions`, `FeatherdownEmbedProvider`, `FeatherdownPlugins`, `TocTreeItem`.
- Code: `code.lineNumbers` and `code.copyButton` global defaults (both `false`), with per-fence opt-outs `noLineNumbers` / `showLineNumbers=false` and `noCopyButton` / `showCopyButton=false`.
- Code: `showLineNumbers=N` starts numbering at `N`.
- Code: `diff` fences mark added and removed lines (`code-line-added`, `code-line-removed`). The `ts diff` meta form does the same for any language, with markers stripped and highlighting kept.
- Front matter metadata: `draft`, `categories`, `image` (from `image`, `cover`, or `ogImage`, including `{ src | url }` objects), `canonical` (`canonicalUrl`, `canonical_url`), `slug`, `lang` (`language`), `keywords` (comma-separated or array), `updated` aliases (`lastmod`, `modified`), and `description` fallbacks (`summary`, `excerpt`).
- Footnotes (GFM) render with working links.
- Manifest entries may include `width` and `height`, which are emitted on the `<img>` when positive.

### Changed

- **Behavior:** `alerts` and `details` are on by default.
- **Behavior:** `assets.styles` and `assets.features` are derived from the content actually rendered, not only from enabled options.
- **Behavior:** `code.copyButton` now defaults to `false`. Previously the option was accepted but had no effect.
- **Behavior:** `metadata.tags` accepts a single string as well as an array.
- **Behavior:** raw `<details class="details">` keeps its `details` class. The class is dropped on other elements.
- **Dependencies:** `hast-util-sanitize` is a direct dependency.
- Legacy helpers (`featherdown/legacy`) get none of the new features (alerts, details, links, images, embeds, the new fence flags, `diff` lines). Their output changes only through:
  - the bug fixes above (footnote ids and links, author ids no longer duplicating footnote ids, links to `{#custom}` heading ids now resolve, the footnotes heading leaves `toc`/`headings`, cleaner excerpts, Node Mermaid ids no longer triple-prefixed, multi-line tokens split per line in highlighted / numbered fences);
  - manifest `width` / `height`, emitted when supplied;
  - raw `<details class="details">` keeping its class.
- Option merging: `parse(md, { group: true })` now keeps the constructor's settings for that group instead of resetting them to defaults, and tuning a group disabled on the constructor (`code: false`, then `{ code: { lineNumbers: true } }`) keeps it disabled unless `enabled: true` is passed.
