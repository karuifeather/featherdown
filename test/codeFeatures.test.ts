import { describe, expect, it } from 'vitest';
import { Featherdown, renderMarkdownToHtml } from '../src/index.js';
import { renderMarkdownToHtmlWithMermaid } from '../src/node.js';

const fence = (info: string, ...lines: string[]): string => ['```' + info, ...lines, '```', ''].join('\n');

async function html(markdown: string, code?: { lineNumbers?: boolean; copyButton?: boolean }): Promise<string> {
  return (await new Featherdown(code ? { code } : {}).parse(markdown)).html;
}

describe('code global defaults', () => {
  const md = fence('ts', 'const a = 1;', 'const b = 2;');

  it('adds nothing by default', async () => {
    const out = await html(md);
    expect(out).not.toContain('code-line');
    expect(out).not.toContain('code-block');
  });

  it('lineNumbers: true numbers every fence', async () => {
    const out = await html(md, { lineNumbers: true });
    expect(out).toContain('code-line-numbered');
    expect(out).toContain('<span class="code-line-number">2</span>');
    expect(out).not.toContain('code-block-copy-button');
  });

  it('copyButton: true adds copy chrome to every fence', async () => {
    const out = await html(md, { copyButton: true });
    expect(out).toContain('code-block-copyable');
    expect(out).toContain('code-block-copy-button');
    expect(out).not.toContain('code-line-numbered');
  });

  it('per-fence opt-out beats the global defaults', async () => {
    for (const info of ['ts noLineNumbers', 'ts showLineNumbers=false']) {
      const out = await html(fence(info, 'const a = 1;'), { lineNumbers: true });
      expect(out).not.toContain('code-line');
    }
    for (const info of ['ts noCopyButton', 'ts showCopyButton=false']) {
      const out = await html(fence(info, 'const a = 1;'), { copyButton: true });
      expect(out).not.toContain('code-block');
    }
  });

  it('does not treat words inside a title as flags', async () => {
    const out = await html(fence('ts title="noCopyButton diff"', '+a'), { copyButton: true });
    expect(out).toContain('code-block-copy-button');
    expect(out).toContain('+a');
  });

  it('composes with titles and highlights', async () => {
    const out = await html(fence('ts title="a.ts" {2}', 'const a = 1;', 'const b = 2;'), {
      lineNumbers: true,
      copyButton: true,
    });
    expect(out).toContain('<div class="code-block-title">a.ts</div>');
    expect(out).toContain('code-block-copy-button');
    expect(out).toContain('<span class="code-line code-line-highlighted"><span class="code-line-number">2</span>');
    expect(out).toContain('<span class="code-line"><span class="code-line-number">1</span>');
  });

  it('leaves chart fences untouched', async () => {
    const chart = fence('chart-bar', '{"labels":["a"],"datasets":[{"data":[1]}]}');
    const plain = await html(chart);
    const withGlobals = await html(chart, { lineNumbers: true, copyButton: true });
    expect(withGlobals).toBe(plain);
  });

  it('leaves mermaid fences without code chrome when globals are on', async () => {
    const out = await html(fence('mermaid', 'graph TD; A-->B;'), { lineNumbers: true, copyButton: true });
    expect(out).toContain('language-mermaid');
    expect(out).not.toContain('code-block');
    expect(out).not.toContain('code-line');
  });

  it('isolates per-parse config on the shared cached processor', async () => {
    const on = new Featherdown({ code: { lineNumbers: true, copyButton: true } });
    const off = new Featherdown();
    const [a, b, c, d] = await Promise.all([on.parse(md), off.parse(md), on.parse(md), off.parse(md)]);
    for (const r of [a, c]) {
      expect(r.html).toContain('code-line-numbered');
      expect(r.html).toContain('code-block-copy-button');
    }
    for (const r of [b, d]) {
      expect(r.html).not.toContain('code-line');
      expect(r.html).not.toContain('code-block');
    }
  });

  it('keeps legacy output unchanged (no globals, no new classes)', async () => {
    const out = await renderMarkdownToHtml(fence('ts', 'const a = 1;'));
    expect(out).not.toContain('code-line');
    expect(out).not.toContain('code-block');
  });
});

describe('line number start', () => {
  it('starts numbering at showLineNumbers=N', async () => {
    const out = await html(fence('ts showLineNumbers=10', 'const a = 1;', 'const b = 2;'));
    expect(out).toContain('<span class="code-line-number">10</span>');
    expect(out).toContain('<span class="code-line-number">11</span>');
    expect(out).not.toContain('<span class="code-line-number">1</span>');
  });

  it('keeps {n} relative to the block when numbering starts later', async () => {
    const out = await html(fence('ts {2} showLineNumbers=10', 'const a = 1;', 'const b = 2;'));
    expect(out).toContain('<span class="code-line code-line-highlighted"><span class="code-line-number">11</span>');
  });

  it('legacy helpers keep the pre-0.5 fence grammar (no =N, no*, diff)', async () => {
    const start = await renderMarkdownToHtml(fence('ts showLineNumbers=10', 'const a = 1;'));
    expect(start).not.toContain('code-line-number');
    const optOut = await renderMarkdownToHtml(fence('ts showLineNumbers noLineNumbers', 'x'));
    expect(optOut).toContain('code-line-number');
    const diffLang = await renderMarkdownToHtml(fence('diff', '+a', '-b'));
    expect(diffLang).not.toContain('code-line-added');
    const diffMeta = await renderMarkdownToHtml(fence('ts diff', '+a', '-b'));
    expect(diffMeta).toContain('+a');
    expect(diffMeta).not.toContain('data-code-diff-lines');
  });

  it('works with global lineNumbers on and an explicit start', async () => {
    const out = await html(fence('ts showLineNumbers=5', 'x'), { lineNumbers: true });
    expect(out).toContain('<span class="code-line-number">5</span>');
  });
});

describe('diff lines', () => {
  it('marks added and removed lines in diff fences, keeping markers', async () => {
    const out = await html(fence('diff', '--- a/f', '+++ b/f', '-old', '+new', ' same'));
    expect(out).toContain('code-line-removed');
    expect(out).toContain('code-line-added');
    expect((out.match(/code-line-added/g) ?? []).length).toBe(1);
    expect((out.match(/code-line-removed/g) ?? []).length).toBe(1);
    expect(out).toContain('-old');
    expect(out).toContain('+new');
  });

  it('shows line numbers on diff fences with the same classes', async () => {
    const out = await html(fence('diff showLineNumbers', '-old', '+new'));
    expect(out).toContain('<span class="code-line code-line-removed"><span class="code-line-number">1</span>');
    expect(out).toContain('<span class="code-line code-line-added"><span class="code-line-number">2</span>');
  });

  it('supports the diff meta flag on other languages, stripping markers and still highlighting', async () => {
    const out = await html(fence('ts diff', 'const a = 1;', '-const b = 2;', '+const b = 3;'));
    expect(out).toContain('language-ts');
    expect(out).toContain('hljs-keyword');
    expect(out).toContain('<span class="code-line code-line-removed"><span class="hljs-keyword">const</span> b = <span class="hljs-number">2</span>;</span>');
    expect(out).toContain('code-line-added');
    expect(out).not.toContain('+const');
    expect(out).not.toContain('-const');
    expect(out).toContain('<span class="code-line"><span class="hljs-keyword">const</span> a');
  });

  it('composes diff meta with titles, highlights and line numbers', async () => {
    const out = await html(fence('ts diff title="x.ts" {1} showLineNumbers=3', '-a', '+b'));
    expect(out).toContain('<div class="code-block-title">x.ts</div>');
    expect(out).toContain('<span class="code-line code-line-highlighted code-line-removed"><span class="code-line-number">3</span>');
    expect(out).toContain('<span class="code-line code-line-added"><span class="code-line-number">4</span>');
  });

  it('does nothing for a diff flag when no line has a marker', async () => {
    const out = await html(fence('ts diff', 'const a = 1;'));
    expect(out).not.toContain('code-line');
  });
});

describe('mermaid entry', () => {
  it('does not add copy chrome to a mermaid fence when copyButton global is on', async () => {
    const out = await renderMarkdownToHtmlWithMermaid(fence('mermaid', 'graph TD; A-->B;'));
    expect(out).not.toContain('code-block-copy-button');
  });
});

describe('line features without syntax highlighting', () => {
  it('applies diff, line numbers and {n} highlights with highlighting off', async () => {
    const { Featherdown } = await import('../src/index.js');
    const fd = new Featherdown({ code: { highlighting: false } });
    const { html: diffHtml } = await fd.parse(fence('ts diff', '+a', '-b'));
    expect(diffHtml).toContain('code-line-added');
    expect(diffHtml).toContain('code-line-removed');
    expect(diffHtml).not.toContain('data-code-diff-lines');
    expect(diffHtml).not.toContain('hljs');
    const { html: numbered } = await fd.parse(fence('ts {2} showLineNumbers', 'a', 'b'));
    expect(numbered).toContain('<span class="code-line code-line-highlighted"><span class="code-line-number">2</span>b</span>');
  });
});
