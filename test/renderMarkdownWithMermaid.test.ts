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

  it('keeps titled non-mermaid code fences as highlighted code blocks in the mermaid path', async () => {
    const md = ['```ts title="example.ts"', 'const value = 1;', '```', ''].join('\n');
    const html = await renderMarkdownToHtmlWithMermaid(md);
    expect(html).toContain('<div class="code-block"><div class="code-block-title">example.ts</div><pre><code class="language-ts">');
    expect(html).toMatch(/hljs-keyword/);
  });

  it('supports line highlight ranges for ordinary non-mermaid code fences in the mermaid path', async () => {
    const md = ['```ts {2}', 'const a = 1;', 'const b = 2;', '```', ''].join('\n');
    const html = await renderMarkdownToHtmlWithMermaid(md);
    expect(html).toContain('<span class="code-line code-line-highlighted"><span class="hljs-keyword">const</span> b = <span class="hljs-number">2</span>;</span>');
    expect(html).toContain('<span class="code-line"><span class="hljs-keyword">const</span> a = <span class="hljs-number">1</span>;</span>');
  });

  it('supports line numbers for ordinary non-mermaid code fences in the mermaid path', async () => {
    const md = ['```ts showLineNumbers', 'const a = 1;', 'const b = 2;', '```', ''].join('\n');
    const html = await renderMarkdownToHtmlWithMermaid(md);
    expect(html).toContain('<code class="language-ts code-line-numbered">');
    expect(html).toContain('<span class="code-line-number">1</span>');
    expect(html).toContain('<span class="code-line-number">2</span>');
    expect(html).toMatch(/hljs-keyword/);
  });

  it('supports copy button markup for ordinary non-mermaid code fences in the mermaid path', async () => {
    const md = ['```ts showCopyButton', 'const a = 1;', '```', ''].join('\n');
    const html = await renderMarkdownToHtmlWithMermaid(md);
    expect(html).toContain('<div class="code-block code-block-copyable">');
    expect(html).toContain('<button type="button" class="code-block-copy-button" data-code-copy=""');
    expect(html).toContain('<code class="language-ts" data-code-copy-target="code-copy-target-1">');
    expect(html).toMatch(/hljs-keyword/);
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

  it('falls back to a normal code block when a mermaid fence is invalid and keeps rendering the rest of the document', async () => {
    const md = [
      '# Intro',
      '',
      '```mermaid',
      'graph TD; A-->',
      '```',
      '',
      'After diagram.',
      '',
      '```ts',
      'const x = 1;',
      '```',
      '',
    ].join('\n');
    const html = await renderMarkdownToHtmlWithMermaid(md);
    expect(html).toContain('<h1 id="user-content-intro"><a href="#intro">Intro</a></h1>');
    expect(html).toContain('<pre><code class="language-mermaid">graph TD; A-->\n</code></pre>');
    expect(html).toContain('<p>After diagram.</p>');
    expect(html).toContain('<pre><code class="language-ts">');
    expect(html).toContain('<span class="hljs-keyword">const</span> x = <span class="hljs-number">1</span>;');
    expect(html).not.toContain('<svg');
  });

  it('does not change default browser-safe behavior', async () => {
    const md = ['```mermaid', 'graph TD; A-->B;', '```', ''].join('\n');
    const html = await renderMarkdownToHtml(md);
    expect(html).toContain('language-mermaid');
    expect(html).not.toContain('<svg');
  });
});

