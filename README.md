# blog-pipeline

TypeScript library for **Markdown-to-HTML publishing**: turning author Markdown into sanitized HTML suitable for static sites, feeds, and similar workflows.

## Install

```bash
npm install blog-pipeline
```

Requires **Node.js 18 or later**.

## API

- **`renderMarkdownToHtml(markdown: string, options?: { kind?: string; slug?: string; manifest?: { map?: Record<string, { url: string }>; remote?: Record<string, { url: string }> } }): Promise<string>`** — Runs the browser-safe base pipeline (GitHub Flavored Markdown, math via KaTeX with HTML output, fenced code highlighting, chart JSON placeholders, heading slugs and autolinks, raw HTML passed through `rehype-raw` then **`rehype-sanitize`**). Returns a complete HTML fragment string (not a full document).

- **`parseMarkdownFile(raw: string): { frontMatter: Record<string, unknown>; content: string }`** — Parses optional YAML between leading `---` fences. If there is no valid block, returns `{ frontMatter: {}, content: raw }`. Invalid YAML throws an error with a clear message.

- **`libraryId(): string`** — Stable package identifier for diagnostics and tests.

Typical flow: `parseMarkdownFile` for metadata, then `renderMarkdownToHtml` on `content`.

## Rendering behavior

`rehype-sanitize` uses the GitHub-style default schema, extended here with **`className` on all allowed elements** (needed for KaTeX, highlight.js, and classed raw HTML) and **`style` on `span` only** (KaTeX’s HTML output uses inline styles on spans). Scripts are stripped.

**Chart placeholders:** a fenced block with language `chart-line`, `chart-bar`, `chart-radar`, `chart-doughnut`, `chart-pie`, `chart-polarArea`, `chart-bubble`, or `chart-scatter` and a JSON body is replaced by `<div class="chart-mount" data-chart="…" data-chart-data="…">` when the JSON parses. Invalid JSON leaves a normal code block. This package does not ship Chart.js or other chart runtimes—only the mount markup.

**Image rewriting (optional):** pass `kind`, `slug`, and a `manifest` to rewrite relative image paths and selected remote URLs from caller-provided manifest data. The renderer does not fetch anything and does not bundle CDN logic.

Heading ids: **`rehype-slug` runs after sanitization**, so ordinary headings get slug ids such as `section-one` with matching `href="#section-one"`. A custom ` {#my-id}` is applied earlier and is subject to the sanitizer’s id handling, so the final `id` and `href` use the `user-content-` prefix (for example `user-content-my-id`).

Math uses KaTeX **`output: 'html'`** so MathML is not emitted. Load KaTeX CSS in your app for correct typography.

Mermaid and pluggable processors are **not** included.

## Scripts

| Script                | Description                    |
|-----------------------|--------------------------------|
| `npm run build`       | Produce ESM output under `dist/` |
| `npm test`            | Run the test suite once          |
| `npm run test:watch`  | Run tests in watch mode          |
| `npm run lint`        | ESLint                           |
| `npm run typecheck`   | TypeScript, no emit              |

## License

MIT — see [LICENSE](./LICENSE).
