import { describe, expect, it } from 'vitest';
import { renderMarkdownToHtml } from '../src/renderMarkdownToHtml.js';

describe('renderMarkdownToHtml', () => {
  it('renders a GFM table', async () => {
    const md = ['| A | B |', '| - | - |', '| 1 | 2 |', ''].join('\n');
    const html = await renderMarkdownToHtml(md);
    expect(html).toContain('<table>');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>1</td>');
  });

  it('renders inline and block math with KaTeX markup', async () => {
    const md = ['Inline $x^2$ and display:', '', '$$', '\\int_0^1 x\\,dx', '$$', ''].join('\n');
    const html = await renderMarkdownToHtml(md);
    expect(html).toContain('katex');
    expect(html).toContain('katex-display');
  });

  it('applies syntax highlighting classes to fenced code', async () => {
    const md = ['```javascript', 'const n = 42;', '```', ''].join('\n');
    const html = await renderMarkdownToHtml(md);
    expect(html).toContain('hljs');
    expect(html).toContain('language-javascript');
    expect(html).toMatch(/hljs-keyword/);
  });

  it('sets final h2 id and autolink href from the slugger for ordinary headings', async () => {
    const html = await renderMarkdownToHtml('## Section One\n');
    expect(html).toBe(
      '<h2 id="section-one"><a href="#section-one">Section One</a></h2>',
    );
  });

  it('deduplicates slug ids when heading text repeats', async () => {
    const html = await renderMarkdownToHtml('## Hello\n\n## Hello\n');
    expect(html).toBe(
      '<h2 id="hello"><a href="#hello">Hello</a></h2>\n<h2 id="hello-1"><a href="#hello-1">Hello</a></h2>',
    );
  });

  it('prefixes {#id} in final HTML and keeps autolink href in sync', async () => {
    const html = await renderMarkdownToHtml('## My Title {#custom-slug}\n');
    expect(html).toBe(
      '<h2 id="user-content-custom-slug"><a href="#user-content-custom-slug">My Title</a></h2>',
    );
    expect(html).not.toContain('{#custom-slug}');
  });

  it('keeps safe raw HTML and drops script tags after sanitize', async () => {
    const md = '<p class="note">Allowed</p>\n\n<script>evil()</script>\n';
    const html = await renderMarkdownToHtml(md);
    expect(html).toContain('class="note"');
    expect(html).toContain('Allowed');
    expect(html).not.toContain('script');
    expect(html).not.toContain('evil');
  });

  it('turns a valid chart fence into a chart-mount div in final HTML', async () => {
    const md = ['```chart-line', '{"labels":["a"],"datasets":[]}', '```', ''].join('\n');
    const html = await renderMarkdownToHtml(md);
    expect(html).toBe(
      '<div class="chart-mount" data-chart="line" data-chart-data="{&#x22;labels&#x22;:[&#x22;a&#x22;],&#x22;datasets&#x22;:[]}"></div>',
    );
  });

  it('leaves invalid JSON chart fences as a normal highlighted code block', async () => {
    const md = ['```chart-line', 'not json', '```', ''].join('\n');
    const html = await renderMarkdownToHtml(md);
    expect(html).toBe(
      '<pre><code class="hljs language-chart-line">not json\n</code></pre>',
    );
  });

  it('ignores unsupported chart language tags', async () => {
    const md = ['```chart-unknown', '{}', '```', ''].join('\n');
    const html = await renderMarkdownToHtml(md);
    expect(html).toBe(
      '<pre><code class="hljs language-chart-unknown">{}\n</code></pre>',
    );
  });
});
