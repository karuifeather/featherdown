import { describe, expect, it } from 'vitest';
import { renderMarkdownToHtml } from '../src/renderMarkdownToHtml.js';
import { renderMarkdownToHtmlWithMermaid } from '../src/node.js';

describe('renderMarkdownToHtmlWithMermaid', () => {
  it('renders a mermaid fence to inline svg html', async () => {
    const md = ['```mermaid', 'graph TD; A-->B;', '```', ''].join('\n');
    const html = await renderMarkdownToHtmlWithMermaid(md);
    expect(html).toContain('<svg');
    expect(html).not.toContain('language-mermaid');
  });

  it('keeps chart placeholder behavior in the mermaid path', async () => {
    const md = ['```chart-line', '{"labels":["a"],"datasets":[]}', '```', ''].join('\n');
    const html = await renderMarkdownToHtmlWithMermaid(md);
    expect(html).toBe(
      '<div class="chart-mount" data-chart="line" data-chart-data="{&#x22;labels&#x22;:[&#x22;a&#x22;],&#x22;datasets&#x22;:[]}"></div>',
    );
  });

  it('keeps image rewriting behavior in the mermaid path', async () => {
    const md = '![Logo](./images/logo.png)\n';
    const html = await renderMarkdownToHtmlWithMermaid(md, {
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
    expect(html).toBe(
      '<p><img src="https://cdn.example.com/blog/hello-world/logo.hash.png" alt="Logo" class="markdown-inline-img"></p>',
    );
  });

  it('strips unsafe script tags in the mermaid path', async () => {
    const md = ['<script>alert(1)</script>', '', '```mermaid', 'graph TD; A-->B;', '```'].join(
      '\n',
    );
    const html = await renderMarkdownToHtmlWithMermaid(md);
    expect(html).toContain('<svg');
    expect(html).not.toContain('<script>');
  });

  it('does not change default browser-safe behavior', async () => {
    const md = ['```mermaid', 'graph TD; A-->B;', '```', ''].join('\n');
    const html = await renderMarkdownToHtml(md);
    expect(html).toContain('language-mermaid');
    expect(html).not.toContain('<svg');
  });
});

