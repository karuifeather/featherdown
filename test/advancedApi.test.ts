import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { createMarkdownProcessor } from '../src/createMarkdownProcessor.js';
import { rehypeChartBlocks } from '../src/rehypeChartBlocks.js';
import { rehypeCdnImages } from '../src/rehypeCdnImages.js';
import { renderMarkdown, renderMarkdownToHtml } from '../src/index.js';

describe('advanced API', () => {
  it('createMarkdownProcessor output matches renderMarkdownToHtml', async () => {
    const md = [
      '## Title',
      '',
      ':::note',
      'Remember this',
      ':::',
      '',
      '![Logo](./images/logo.png)',
      '',
      '```chart-line',
      '{"labels":["a"],"datasets":[]}',
      '```',
      '',
    ].join('\n');

    const htmlA = await renderMarkdownToHtml(md, {
      kind: 'post',
      slug: 'x',
      manifest: {
        map: {
          'post/x/images/logo.png': { url: 'https://cdn.example.com/logo.png' },
        },
      },
    });

    const processor = createMarkdownProcessor({
      kind: 'post',
      slug: 'x',
      manifest: {
        map: {
          'post/x/images/logo.png': { url: 'https://cdn.example.com/logo.png' },
        },
      },
    });
    const htmlB = String(await processor.process(md));

    expect(htmlB).toBe(htmlA);
  });

  it('public rehypeChartBlocks works in a minimal pipeline', async () => {
    const md = ['```chart-line', '{"a":1}', '```', ''].join('\n');
    const file = await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeChartBlocks)
      .use(rehypeStringify)
      .process(md);
    expect(String(file)).toBe(
      '<div class="chart-mount" data-chart="line" data-chart-data="{&#x22;a&#x22;:1}"></div>',
    );
  });

  it('public rehypeCdnImages works in a minimal pipeline', async () => {
    const md = '![Logo](./images/logo.png)\n';
    const file = await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeCdnImages, {
        kind: 'post',
        slug: 'x',
        manifest: {
          map: { 'post/x/images/logo.png': { url: 'https://cdn.example.com/logo.png' } },
        },
      })
      .use(rehypeStringify)
      .process(md);
    expect(String(file)).toBe(
      '<p><img src="https://cdn.example.com/logo.png" alt="Logo" class="markdown-inline-img"></p>',
    );
  });

  it('diagnostics still work through renderMarkdown', async () => {
    const md = ['```chart-line', 'not json', '```', ''].join('\n');
    const { html, diagnostics } = await renderMarkdown(md);
    expect(html).toBe('<pre><code class="hljs language-chart-line">not json\n</code></pre>');
    expect(diagnostics).toEqual([
      {
        code: 'chart.invalid_json',
        message: 'Chart JSON could not be parsed for type "line".',
        severity: 'warning',
        source: 'chart',
      },
    ]);
  });
});

