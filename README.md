# featherdown

**featherdown** is an ESM-first Markdown publishing engine for **Node, browsers, and Deno**.

It turns Markdown into sanitized HTML with a production-friendly pipeline that includes:

- GFM
- math via KaTeX
- syntax highlighting
- heading anchors
- chart placeholder blocks
- optional manifest-based image rewriting
- non-fatal render diagnostics
- an optional **Node-only Mermaid** entry for static SVG rendering

It is built for publishing workflows that want more than raw Markdown parsing, but less complexity than assembling and maintaining a full unified stack by hand.

## Why featherdown?

Use `featherdown` when you want:

- a ready-to-use Markdown → HTML pipeline
- a browser-safe default entry
- explicit sanitization instead of “bring your own sanitizer”
- publishing-oriented extras like chart placeholders and image rewriting
- optional diagnostics for content issues that should not crash rendering
- a separate Node-only Mermaid path instead of bundling Node-specific behavior into the default entry

## Install

```bash
npm install featherdown
```

JSR / Deno:

```ts
import { renderMarkdownToHtml } from "jsr:@karuifeather/featherdown";
```

Node.js 18+ is required.

If you use Mermaid rendering from `featherdown/node`, install Playwright and Chromium:

```bash
npm install playwright
npx playwright install chromium
```

## Quick Start

```ts
import { renderMarkdownToHtml } from "featherdown";

const html = await renderMarkdownToHtml("## Hello **world**");
```

The default entry is browser-safe and does **not** include Mermaid rendering.

## Common Use Cases

### Render Markdown to HTML

```ts
import { renderMarkdownToHtml } from "featherdown";

const html = await renderMarkdownToHtml(`
# Post Title

Here is some math: $E = mc^2$

| Name | Value |
| ---- | ----- |
| A    | 1     |
`);
```

### Render HTML with warnings

Use `renderMarkdown` when you want HTML plus non-fatal diagnostics.

````ts
import { renderMarkdown } from "featherdown";

const { html, diagnostics } = await renderMarkdown(
  "```chart-line\nnot json\n```",
);

console.log(html);
console.log(diagnostics);
````

Diagnostics are intended for developer feedback, not end-user rendering.

### Render HTML with document metadata

Use `renderMarkdownDocument` when publishing workflows need HTML plus table-of-contents data, excerpt text, and reading stats from the final browser-safe output.

```ts
import { renderMarkdownDocument } from "featherdown";

const document = await renderMarkdownDocument(`
# Post Title

This first paragraph can be used as preview text.

## Section A
Body text here.
`);

console.log(document.html);
console.log(document.toc);
console.log(document.excerpt);
console.log(document.wordCount, document.estimatedReadingMinutes);
```

Returned metadata:

- `toc`: ordered heading list with `depth`, final `text`, and final `id`
- `excerpt`: first meaningful plain-text content from rendered `p`, `blockquote`, or `li`, or `null`
- `wordCount`: deterministic plain-text word count from rendered document text
- `estimatedReadingMinutes`: whole-minute estimate from word count (minimum `1` when text exists, `0` when none)

The metadata is derived from the same processed document structure that produces the final HTML, so TOC ids and text stay aligned with rendered output.

Common uses include TOC sidebars, preview cards, and reading-time badges.

### Parse front matter

```ts
import { parseMarkdownFile } from "featherdown";

const result = parseMarkdownFile(`---
title: Hello
tags:
  - docs
---

# Hello world
`);

console.log(result.frontMatter);
console.log(result.content);
```

## Publishing Features

### Chart placeholder blocks

Supported `chart-*` code fences with valid JSON are transformed into placeholder mount nodes.

````md
```chart-line
{"labels":["a"],"datasets":[]}
```
````

Rendered HTML shape:

```html
<div
  class="chart-mount"
  data-chart="line"
  data-chart-data='{"labels":["a"],"datasets":[]}'
></div>
```

`featherdown` does not bundle a chart runtime. It only emits mount markup that your app can hydrate later.

### Admonitions / callouts

The default browser-safe pipeline supports fenced admonitions using `:::type` with a closing `:::`.
You can optionally provide a title with bracket syntax: `:::type[Title]`.

Supported types:

- `note`
- `tip`
- `warning`
- `info`
- `success`
- `danger`
- `error`
- `caution`
- `important`

Example:

````md
:::note[Install CSS]
Remember to install KaTeX CSS.
:::
````

Emitted HTML contract:

```html
<div class="callout callout-note">
  <div class="callout-title">Install CSS</div>
  <p>Remember to install KaTeX CSS.</p>
</div>
```

When no custom title is provided, a default title is emitted from the callout type (for example `warning` -> `Warning`).
Callout body content continues through the normal Markdown pipeline, and styling is left to the consuming application.

### Image rewriting

Use manifest-based rewriting for relative Markdown images in publishing workflows.

```ts
import { renderMarkdownToHtml } from "featherdown";

const html = await renderMarkdownToHtml("![Logo](./images/logo.png)", {
  kind: "post",
  slug: "hello-world",
  manifest: {
    map: {
      "post/hello-world/images/logo.png": {
        url: "https://cdn.example.com/blog/hello-world/logo.hash.png",
      },
    },
  },
});
```

Relative image rewriting is optional and entirely caller-driven. No CDN logic or fetch behavior is bundled into the package.

## Advanced Usage

### Create the default processor directly

Use `createMarkdownProcessor` when you want direct control over processing calls while keeping featherdown’s default browser-safe pipeline.

```ts
import { createMarkdownProcessor } from "featherdown";

const processor = createMarkdownProcessor();
const file = await processor.process("# Hello");
const html = String(file);
```

### Use the plugins directly

The package also exports focused plugins for custom unified pipelines.

```ts
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { rehypeChartBlocks, rehypeCdnImages } from "featherdown";

const html = String(
  await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeChartBlocks)
    .use(rehypeCdnImages, { kind: "post", slug: "hello-world" })
    .use(rehypeStringify)
    .process(markdown),
);
```

## Node-only Mermaid Rendering

For static Mermaid rendering, use the separate Node-only entry:

````ts
import { renderMarkdownToHtmlWithMermaid } from "featherdown/node";

const html = await renderMarkdownToHtmlWithMermaid(
  "```mermaid\ngraph TD; A-->B;\n```",
);
````

Use this entry in Node publishing environments where Playwright + Chromium dependencies are acceptable.

The Mermaid subpath is npm-focused and is **not** part of the JSR export surface.

## CSS / Asset Expectations

- KaTeX CSS is required for correct math styling.
- Syntax highlighting output includes highlight.js classes; include matching styles in your app.
- Mermaid rendering from `featherdown/node` depends on Playwright Chromium availability.

## Security and Trust Guidance

- Input is sanitized with `rehype-sanitize`.
- Script tags are stripped.
- The default entry is designed to be browser-safe.
- The Mermaid entry is better suited to trusted Node publishing workflows than arbitrary user-generated content.
- Always review your final HTML integration, especially if you add custom plugins around the built-in pipeline.

## Why not just wire unified yourself?

You absolutely can.

`featherdown` exists for teams that want:

- a production-friendly default pipeline
- deliberate plugin ordering
- sanitization already considered
- publishing-oriented features beyond plain Markdown parsing
- a clean split between browser-safe rendering and Node-only Mermaid rendering

## Public API

Default entry (`featherdown`):

- `renderMarkdownToHtml`
- `renderMarkdown`
- `renderMarkdownDocument`
- `createMarkdownProcessor`
- `rehypeChartBlocks`
- `rehypeCdnImages`
- `parseMarkdownFile`
- `libraryId`

Node-only entry (`featherdown/node`):

- `renderMarkdownToHtmlWithMermaid`

## Scripts

| Script                 | Description                       |
| ---------------------- | --------------------------------- |
| `npm run build`        | Build ESM artifacts in `dist/`    |
| `npm test`             | Run Vitest once                   |
| `npm run test:watch`   | Run Vitest in watch mode          |
| `npm run lint`         | Run ESLint                        |
| `npm run typecheck`    | Run TypeScript checks             |
| `npm run test:exports` | Build and run export smoke checks |

## Maintainers

CI and publishing are documented in [RELEASING.md](./RELEASING.md).

## License

MIT. See [LICENSE](./LICENSE).
