# blog-pipeline

`blog-pipeline` is a TypeScript package for converting Markdown into sanitized HTML for publishing workflows.

It provides a browser-safe default entry and a separate Node-only Mermaid subpath.

## Install

```bash
npm install blog-pipeline
```

Node.js 18+ is required.

If you use Mermaid rendering from `blog-pipeline/node`, install Playwright Chromium:

```bash
npx playwright install chromium
```

## Quick Start (Browser-Safe Default Entry)

```ts
import { renderMarkdownToHtml } from 'blog-pipeline';

const html = await renderMarkdownToHtml('## Hello **world**');
```

The default entry does not include Mermaid rendering.

## HTML + Diagnostics

Use `renderMarkdown` to get both HTML and non-fatal warnings.

```ts
import { renderMarkdown } from 'blog-pipeline';

const { html, diagnostics } = await renderMarkdown(
  '```chart-line\nnot json\n```',
);

console.log(html);
console.log(diagnostics);
```

## Processor Factory Usage

Use `createMarkdownProcessor` when you want direct control of processing calls.

```ts
import { createMarkdownProcessor } from 'blog-pipeline';

const processor = createMarkdownProcessor();
const file = await processor.process('# Hello');
const html = String(file);
```

## Direct Plugin Usage

The package exports focused plugins for custom unified pipelines.

```ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { rehypeChartBlocks, rehypeCdnImages } from 'blog-pipeline';

const html = String(
  await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeChartBlocks)
    .use(rehypeCdnImages, { kind: 'post', slug: 'hello-world' })
    .use(rehypeStringify)
    .process(markdown),
);
```

## Image Rewriting Example

```ts
import { renderMarkdownToHtml } from 'blog-pipeline';

const html = await renderMarkdownToHtml('![Logo](./images/logo.png)', {
  kind: 'post',
  slug: 'hello-world',
  manifest: {
    map: {
      'post/hello-world/images/logo.png': {
        url: 'https://cdn.example.com/blog/hello-world/logo.hash.png',
      },
    },
  },
});
```

## Chart Placeholder Example

Valid JSON in supported `chart-*` fences becomes a placeholder mount node:

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
  data-chart-data="{&quot;labels&quot;:[&quot;a&quot;],&quot;datasets&quot;:[]}"
></div>
```

This package does not bundle a chart runtime; it only emits mount markup.

## Node-Only Mermaid Subpath

```ts
import { renderMarkdownToHtmlWithMermaid } from 'blog-pipeline/node';

const html = await renderMarkdownToHtmlWithMermaid(
  '```mermaid\ngraph TD; A-->B;\n```',
);
```

Use this entry in Node publishing environments where Playwright + Mermaid dependencies are acceptable.

## CSS / Asset Expectations

- KaTeX CSS is required for correct math styling.
- Syntax highlighting output includes highlight.js classes; include matching styles in your app.
- Mermaid rendering from `blog-pipeline/node` depends on Playwright Chromium availability.

## Security and Trust Guidance

- Input is sanitized with `rehype-sanitize`; scripts are removed.
- Treat Markdown as untrusted by default unless your ingestion workflow guarantees trusted content.
- Review and test your final HTML integration, including any custom render-time plugins you add.

## Public API

Default entry (`blog-pipeline`):

- `renderMarkdownToHtml`
- `renderMarkdown`
- `createMarkdownProcessor`
- `rehypeChartBlocks`
- `rehypeCdnImages`
- `parseMarkdownFile`
- `libraryId`

Node-only entry (`blog-pipeline/node`):

- `renderMarkdownToHtmlWithMermaid`

## Scripts

| Script | Description |
|---|---|
| `npm run build` | Build ESM artifacts in `dist/` |
| `npm test` | Run Vitest once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |
| `npm run test:exports` | Build and run export smoke checks |

## License

MIT. See [LICENSE](./LICENSE).
