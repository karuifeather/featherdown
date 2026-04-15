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

  it('renders note directives as callout containers', async () => {
    const html = await renderMarkdownToHtml([':::note', 'Remember to install KaTeX CSS.', ':::', ''].join('\n'));
    expect(html).toBe(
      '<div class="callout callout-note"><div class="callout-title">Note</div><p>Remember to install KaTeX CSS.</p></div>',
    );
  });

  it('renders tip, warning, info, success, danger, error, caution, and important directives with stable classes', async () => {
    const html = await renderMarkdownToHtml(
      [
        ':::tip',
        'Tip text',
        ':::',
        '',
        ':::warning',
        'Warning text',
        ':::',
        '',
        ':::info',
        'Info text',
        ':::',
        '',
        ':::success',
        'Success text',
        ':::',
        '',
        ':::danger',
        'Danger text',
        ':::',
        '',
        ':::error',
        'Error text',
        ':::',
        '',
        ':::caution',
        'Caution text',
        ':::',
        '',
        ':::important',
        'Important text',
        ':::',
        '',
      ].join('\n'),
    );
    expect(html).toContain('<div class="callout callout-tip">');
    expect(html).toContain('<div class="callout callout-warning">');
    expect(html).toContain('<div class="callout callout-info">');
    expect(html).toContain('<div class="callout callout-success">');
    expect(html).toContain('<div class="callout callout-danger">');
    expect(html).toContain('<div class="callout callout-error">');
    expect(html).toContain('<div class="callout callout-caution">');
    expect(html).toContain('<div class="callout callout-important">');
  });

  it('emits default title when no custom title is provided', async () => {
    const html = await renderMarkdownToHtml([':::warning', 'Be careful.', ':::', ''].join('\n'));
    expect(html).toBe(
      '<div class="callout callout-warning"><div class="callout-title">Warning</div><p>Be careful.</p></div>',
    );
  });

  it('uses custom title when provided', async () => {
    const html = await renderMarkdownToHtml([':::note[Install CSS]', 'Remember to install KaTeX CSS.', ':::', ''].join('\n'));
    expect(html).toBe(
      '<div class="callout callout-note"><div class="callout-title">Install CSS</div><p>Remember to install KaTeX CSS.</p></div>',
    );
  });

  it('renders title text as plain text', async () => {
    const html = await renderMarkdownToHtml([':::info[Install CSS v1]', 'Body', ':::', ''].join('\n'));
    expect(html).toContain('<div class="callout-title">Install CSS v1</div>');
    expect(html).not.toContain('<div class="callout-title"><em>');
    expect(html).not.toContain('<div class="callout-title"><strong>');
  });

  it('normalizes title whitespace', async () => {
    const html = await renderMarkdownToHtml([':::note[  Install   CSS\tv1  ]', 'Body', ':::', ''].join('\n'));
    expect(html).toContain('<div class="callout-title">Install CSS v1</div>');
  });

  it('escapes unusual title characters safely', async () => {
    const html = await renderMarkdownToHtml([':::warning[Use & "quotes" and \'single\']', 'Body', ':::', ''].join('\n'));
    expect(html).toContain('<div class="callout-title">Use &#x26; "quotes" and \'single\'</div>');
    expect(html).not.toContain('<div class="callout-title"><');
  });

  it('falls back to the default title for an empty label', async () => {
    const html = await renderMarkdownToHtml([':::tip[]', 'Body', ':::', ''].join('\n'));
    expect(html).toContain('<div class="callout-title">Tip</div>');
    expect(html).not.toContain('<div class="callout-title"></div>');
  });

  it('keeps inner markdown formatting inside callouts', async () => {
    const html = await renderMarkdownToHtml([':::note', 'Remember **bold** and _emphasis_.', ':::', ''].join('\n'));
    expect(html).toBe(
      '<div class="callout callout-note"><div class="callout-title">Note</div><p>Remember <strong>bold</strong> and <em>emphasis</em>.</p></div>',
    );
  });

  it('renders list content inside callouts through normal markdown processing', async () => {
    const html = await renderMarkdownToHtml([':::warning', '- One', '- Two', ':::', ''].join('\n'));
    expect(html).toBe(
      '<div class="callout callout-warning"><div class="callout-title">Warning</div><ul>\n<li>One</li>\n<li>Two</li>\n</ul></div>',
    );
  });

  it('keeps unsupported directives as normal markdown content', async () => {
    const html = await renderMarkdownToHtml([':::custom', 'Unsupported type', ':::', ''].join('\n'));
    expect(html).toBe('<p>:::custom</p>\n<p>Unsupported type</p>\n<p>:::</p>');
    expect(html).not.toContain('callout');
  });

  it('rewrites relative image paths from manifest.map', async () => {
    const md = '![Logo](./images/logo.png)\n';
    const html = await renderMarkdownToHtml(md, {
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

  it('keeps remote image src when no remote mapping exists', async () => {
    const md = '![CDN](https://img.example.com/a.png)\n';
    const html = await renderMarkdownToHtml(md, {
      kind: 'post',
      slug: 'hello-world',
    });
    expect(html).toBe(
      '<p><img src="https://img.example.com/a.png" alt="CDN" class="markdown-inline-img"></p>',
    );
  });

  it('rewrites remote image src through manifest.remote', async () => {
    const md = '![CDN](https://img.example.com/a.png)\n';
    const html = await renderMarkdownToHtml(md, {
      kind: 'post',
      slug: 'hello-world',
      manifest: {
        remote: {
          'https://img.example.com/a.png': {
            url: 'https://cdn.example.com/remote/a.optimized.png',
          },
        },
      },
    });
    expect(html).toBe(
      '<p><img src="https://cdn.example.com/remote/a.optimized.png" alt="CDN" class="markdown-inline-img"></p>',
    );
  });

  it('does not rewrite root-relative image src', async () => {
    const md = '![Root](/images/logo.png)\n';
    const html = await renderMarkdownToHtml(md, {
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
      '<p><img src="/images/logo.png" alt="Root" class="markdown-inline-img"></p>',
    );
  });

  it('adds image class only when kind or slug is missing', async () => {
    const md = '![Logo](./images/logo.png)\n';
    const html = await renderMarkdownToHtml(md, {
      manifest: {
        map: {
          'post/hello-world/images/logo.png': {
            url: 'https://cdn.example.com/blog/hello-world/logo.hash.png',
          },
        },
      },
    });
    expect(html).toBe(
      '<p><img src="./images/logo.png" alt="Logo" class="markdown-inline-img"></p>',
    );
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
