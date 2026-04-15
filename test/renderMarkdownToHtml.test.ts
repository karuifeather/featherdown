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

  it('adds slugs and autolink wrap to headings', async () => {
    const html = await renderMarkdownToHtml('## Section One\n');
    expect(html).toContain('id="');
    expect(html).toMatch(/<h2[^>]*><a[^>]*href="#[^"]+"/);
    expect(html).toContain('Section One');
  });

  it('honors custom heading ids from {#id} syntax', async () => {
    const html = await renderMarkdownToHtml('## My Title {#custom-slug}\n');
    expect(html).toContain('user-content-custom-slug');
    expect(html).toContain('My Title');
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
});
