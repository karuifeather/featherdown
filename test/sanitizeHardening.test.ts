import { describe, expect, it } from 'vitest';
import { Featherdown } from '../src/index.js';
import { Featherdown as NodeFeatherdown } from '../src/node.js';

const hostile = [
  '<span style="position:fixed;inset:0;z-index:9999">overlay</span>',
  '',
  '<div class="callout callout-note fixed inset-0">spoofed</div>',
  '',
  '<p class="text-red-500 code-block">classes</p>',
  '',
  '<button onclick="steal()">Copy</button>',
  '',
  '<div class="chart-mount" data-chart="bar" data-chart-data="{}">fake chart</div>',
  '',
].join('\n');

describe('sanitizer hardening (author raw HTML)', () => {
  it('strips inline style from author spans', async () => {
    const { html } = await new Featherdown().parse(hostile);
    expect(html).toContain('<span>overlay</span>');
    expect(html).not.toContain('position:fixed');
  });

  it('keeps only callout classes on author divs', async () => {
    const { html } = await new Featherdown().parse(hostile);
    expect(html).toContain('<div class="callout callout-note">spoofed</div>');
    expect(html).not.toContain('inset-0');
  });

  it('strips arbitrary and Featherdown-internal classes from author elements', async () => {
    const { html } = await new Featherdown().parse(hostile);
    expect(html).toContain('<p>classes</p>');
    expect(html).not.toContain('text-red-500');
    expect(html).not.toContain('chart-mount');
    expect(html).not.toContain('data-chart');
  });

  it('removes author <button> elements', async () => {
    const { html } = await new Featherdown().parse(hostile);
    expect(html).not.toContain('<button');
    expect(html).not.toContain('steal');
  });

  it('still renders KaTeX with its inline layout styles', async () => {
    const { html } = await new Featherdown({ math: true }).parse('Inline $a^2$ math.\n');
    expect(html).toContain('class="katex"');
    expect(html).toMatch(/<span class="strut" style="height:[^"]+">/);
  });

  it('still emits trusted code-block chrome and chart mounts', async () => {
    const md = [
      '```ts title="a.ts" showCopyButton',
      'const a = 1;',
      '```',
      '',
      '```chart-bar',
      '{"labels":["a"],"values":[1]}',
      '```',
      '',
    ].join('\n');
    const { html } = await new Featherdown().parse(md);
    expect(html).toContain('<div class="code-block-title">a.ts</div>');
    expect(html).toContain('<button type="button" class="code-block-copy-button"');
    expect(html).toContain('<div class="chart-mount" data-chart="bar"');
  });

  it('applies the same author-content rules in the Node Mermaid pipeline', async () => {
    const browser = await new Featherdown().parse(hostile);
    const node = await new NodeFeatherdown({ mermaid: { render: 'svg' } }).parse(hostile);
    expect(node.html).toBe(browser.html);
  });

  it('sanitizes Mermaid SVG output in a second pass', async () => {
    const md = ['```mermaid', 'graph TD; A-->B', '```', ''].join('\n');
    const { html } = await new NodeFeatherdown({ mermaid: { render: 'svg' } }).parse(md);
    expect(html).toContain('<svg');
    // Only the post-Mermaid sanitize pass can clobber-prefix the SVG's own id.
    expect(html).toMatch(/<svg id="user-content-mermaid-\d+"/);
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/\son[a-z]+=/i);
  }, 30_000);

  it('keeps title and copy chrome on titled Mermaid fences', async () => {
    const md = ['```mermaid title="Flow" showCopyButton', 'graph TD; A-->B', '```', ''].join('\n');
    const { html } = await new NodeFeatherdown({ mermaid: { render: 'svg' } }).parse(md);
    expect(html).toMatch(
      /^<div class="code-block code-block-copyable"><div class="code-block-title">Flow<\/div><button type="button" class="code-block-copy-button"[^>]*>Copy<\/button><svg /,
    );
  }, 30_000);
});
