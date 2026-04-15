# blog-pipeline

TypeScript library for **Markdown-to-HTML publishing**: turning author Markdown into sanitized HTML suitable for static sites, feeds, and similar workflows.

## Install

```bash
npm install blog-pipeline
```

Requires **Node.js 18 or later**.

## API

- **`renderMarkdownToHtml(markdown: string): Promise<string>`** — Runs the browser-safe base pipeline (GitHub Flavored Markdown, math via KaTeX with HTML output, fenced code highlighting, heading slugs and autolinks, raw HTML passed through `rehype-raw` then **`rehype-sanitize`**). Returns a complete HTML fragment string (not a full document).

- **`parseMarkdownFile(raw: string): { frontMatter: Record<string, unknown>; content: string }`** — Parses optional YAML between leading `---` fences. If there is no valid block, returns `{ frontMatter: {}, content: raw }`. Invalid YAML throws an error with a clear message.

- **`libraryId(): string`** — Stable package identifier for diagnostics and tests.

Typical flow: `parseMarkdownFile` for metadata, then `renderMarkdownToHtml` on `content`.

## Rendering behavior

The sanitizer extends the default GitHub-style schema with **`className` and `style`** on elements so KaTeX and syntax highlighting output is preserved; scripts are still stripped. Math is rendered with **`output: 'html'`** so MathML tags are avoided and the schema stays manageable. For correct math typography in a browser, load KaTeX CSS in your app.

CDN rewrites, diagrams, charts, and pluggable processors are **not** included.

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
