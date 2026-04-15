import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../src/renderMarkdown.js';
import { renderMarkdownToHtml } from '../src/renderMarkdownToHtml.js';

describe('renderMarkdown diagnostics', () => {
  it('returns html plus empty diagnostics for a normal render', async () => {
    const { html, diagnostics } = await renderMarkdown('# Hello\n');
    expect(html).toBe('<h1 id="hello"><a href="#hello">Hello</a></h1>');
    expect(diagnostics).toEqual([]);
  });

  it('emits a warning for invalid JSON in a supported chart fence and keeps the code block', async () => {
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

  it('does not emit a diagnostic for unsupported chart types', async () => {
    const md = ['```chart-unknown', 'not json', '```', ''].join('\n');
    const { html, diagnostics } = await renderMarkdown(md);
    expect(html).toBe('<pre><code class="hljs language-chart-unknown">not json\n</code></pre>');
    expect(diagnostics).toEqual([]);
  });

  it('emits a warning on relative image manifest miss and leaves src unchanged', async () => {
    const md = '![Logo](./images/logo.png)\n';
    const { html, diagnostics } = await renderMarkdown(md, {
      kind: 'post',
      slug: 'hello-world',
      manifest: { map: {} },
    });
    expect(html).toBe(
      '<p><img src="./images/logo.png" alt="Logo" class="markdown-inline-img"></p>',
    );
    expect(diagnostics).toEqual([
      {
        code: 'images.manifest_miss',
        message: 'No manifest entry found for "post/hello-world/images/logo.png".',
        severity: 'warning',
        source: 'images',
      },
    ]);
  });

  it('does not emit a diagnostic when relative image rewrite succeeds', async () => {
    const md = '![Logo](./images/logo.png)\n';
    const { diagnostics } = await renderMarkdown(md, {
      kind: 'post',
      slug: 'hello-world',
      manifest: {
        map: {
          'post/hello-world/images/logo.png': { url: 'https://cdn.example.com/x.png' },
        },
      },
    });
    expect(diagnostics).toEqual([]);
  });

  it('renderMarkdownToHtml returns only the html string', async () => {
    const html = await renderMarkdownToHtml('# Hello\n');
    expect(html).toBe('<h1 id="hello"><a href="#hello">Hello</a></h1>');
  });
});

