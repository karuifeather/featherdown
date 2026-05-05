import { describe, expect, it } from 'vitest';
import { Featherdown } from '../../src/featherdown.js';

const chartMd = ['```chart-line', '{"labels":["a"],"datasets":[]}', '```', ''].join('\n');

describe('README-documented option behavior (user-observable)', () => {
  it('math: false removes KaTeX from HTML and assets', async () => {
    const md = 'Inline $x$ math.\n';
    const on = await new Featherdown({ math: true }).parse(md);
    const off = await new Featherdown({ math: false }).parse(md);
    expect(on.html.toLowerCase()).toContain('katex');
    expect(off.html.toLowerCase()).not.toContain('katex');
    expect(off.assets.features.math).toBe(false);
    expect(off.assets.styles).not.toContain('featherdown/styles/katex.css');
  });

  it('code: false removes code/highlight assets and code feature flag', async () => {
    const md = '```ts\nconst x = 1;\n```\n';
    const off = await new Featherdown({ code: false }).parse(md);
    expect(off.assets.features.code).toBe(false);
    expect(off.assets.styles).not.toContain('featherdown/styles/code.css');
    expect(off.assets.styles).not.toContain('featherdown/styles/highlight.css');
  });

  it('code.highlighting: false keeps code.css but omits highlight.css', async () => {
    const result = await new Featherdown({
      code: { enabled: true, highlighting: false },
    }).parse('```ts\nconst x = 1;\n```\n');
    expect(result.assets.styles).toContain('featherdown/styles/code.css');
    expect(result.assets.styles).not.toContain('featherdown/styles/highlight.css');
  });

  it('diagnostics: false yields empty diagnostics array', async () => {
    const md = ['```chart-line', 'not json', '```', ''].join('\n');
    const result = await new Featherdown({ diagnostics: false }).parse(md);
    expect(result.diagnostics).toEqual([]);
  });

  it('charts: false omits chart mount placeholders', async () => {
    const result = await new Featherdown({ charts: false }).parse(chartMd);
    expect(result.assets.features.charts).toBe(false);
    expect(result.html).not.toContain('chart-mount');
  });

  it('publishing: false zeros excerpt and counts in the result', async () => {
    const md = ['# Title', '', 'Intro for excerpt.', '', 'word '.repeat(20)].join('\n');
    const result = await new Featherdown({ publishing: false }).parse(md);
    expect(result.excerpt).toBeNull();
    expect(result.wordCount).toBe(0);
    expect(result.estimatedReadingMinutes).toBe(0);
    expect(result.stats.wordCount).toBe(0);
    expect(result.stats.readingTimeMinutes).toBe(0);
  });

  it('frontmatter: auto strips valid YAML from body string', async () => {
    const raw = ['---', 'title: X', '---', '', '# Y', ''].join('\n');
    const result = await new Featherdown({ frontmatter: 'auto' }).parse(raw);
    expect(result.body.trim()).toBe('# Y');
    expect(result.frontmatter.title).toBe('X');
  });

  it('sanitize: false still returns HTML string without throwing', async () => {
    const result = await new Featherdown({ sanitize: false }).parse('# Hello\n');
    expect(typeof result.html).toBe('string');
    expect(result.html).toContain('Hello');
  });
});
