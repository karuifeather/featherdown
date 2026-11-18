import { describe, expect, it } from 'vitest';
import { Featherdown } from '../src/index.js';
import { Featherdown as NodeFeatherdown } from '../src/node.js';
import { renderMarkdownToHtml } from '../src/legacy.js';

const doc = [
  '# Intro {#custom}',
  '',
  '## Second heading',
  '',
  'See [custom](#custom), [second](#second-heading) and a note[^1] plus another[^long-name].',
  '',
  '[^1]: First footnote.',
  '[^long-name]: Second footnote.',
  '',
].join('\n');

function fragmentHrefs(html: string): string[] {
  return [...html.matchAll(/href="#([^"]+)"/g)].map((m) => decodeURIComponent(m[1] ?? ""));
}

function ids(html: string): Set<string> {
  return new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1] ?? ""));
}

function expectLinksResolve(html: string): void {
  const known = ids(html);
  const hrefs = fragmentHrefs(html);
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    expect(known, `dangling #${href}`).toContain(href);
  }
}

function expectNoDoublePrefix(html: string): void {
  expect(html).not.toContain('user-content-user-content-');
}

describe('same-document link integrity', () => {
  for (const sanitize of [true, false]) {
    it(`browser entry resolves every #fragment (sanitize: ${String(sanitize)})`, async () => {
      const { html } = await new Featherdown({ sanitize }).parse(doc);
      expectLinksResolve(html);
      expectNoDoublePrefix(html);
    });
  }

  it('legacy helper resolves every #fragment', async () => {
    const html = await renderMarkdownToHtml(doc);
    expectLinksResolve(html);
    expectNoDoublePrefix(html);
  });

  it('node entry without mermaid matches the browser entry', async () => {
    const browser = await new Featherdown().parse(doc);
    const node = await new NodeFeatherdown().parse(doc);
    expect(node.html).toBe(browser.html);
  });

  it('node mermaid path does not re-prefix non-SVG ids', async () => {
    const md = `${doc}\n\`\`\`mermaid\ngraph TD; A-->B;\n\`\`\`\n`;
    const browser = await new Featherdown().parse(doc);
    const { html } = await new NodeFeatherdown({ mermaid: { render: 'svg' } }).parse(md);
    expectNoDoublePrefix(html);
    expectLinksResolve(html.replace(/<svg[\s\S]*<\/svg>/, ''));
    expect(html).toMatch(/<svg id="user-content-mermaid-\d+"/);
    expect(html.replace(/\n?<svg[\s\S]*<\/svg>\n?/, '\n').trim()).toBe(browser.html.trim());
  }, 60_000);

  it('leaves links to unprefixed slug ids alone', async () => {
    const { html } = await new Featherdown().parse(doc);
    expect(html).toContain('href="#second-heading"');
    expect(html).toContain('href="#user-content-custom"');
  });
});

describe('footnotes and publishing metadata', () => {
  it('keeps the footnotes heading out of toc and headings', async () => {
    const r = await new Featherdown().parse(doc);
    expect(r.toc.map((t) => t.text)).toEqual(['Intro', 'Second heading']);
    expect(r.headings.map((h) => h.text)).toEqual(['Intro', 'Second heading']);
  });

  it('strips footnote markers and gaps from the excerpt', async () => {
    const r = await new Featherdown().parse('Text[^1] with ![img](./a.png) here.\n\n[^1]: Foot.\n');
    expect(r.excerpt).toBe('Text with here.');
  });

  it('never takes the excerpt from the footnotes section', async () => {
    const r = await new Featherdown().parse('# Only heading[^1]\n\n[^1]: Foot.\n');
    expect(r.excerpt).toBeNull();
  });
});

describe('front matter dates', () => {
  const fd = new Featherdown({ frontmatter: 'auto' });

  it('normalizes unquoted YAML dates to YYYY-MM-DD in metadata', async () => {
    const r = await fd.parse('---\ndate: 2026-01-02\nupdated: 2026-03-04\n---\nx');
    expect(r.metadata.date).toBe('2026-01-02');
    expect(r.metadata.updated).toBe('2026-03-04');
    expect(r.frontmatter.date).toBeInstanceOf(Date);
  });

  it('keeps timestamps as full ISO strings', async () => {
    const r = await fd.parse('---\ndate: 2026-01-02T10:30:00Z\n---\nx');
    expect(r.metadata.date).toBe('2026-01-02T10:30:00.000Z');
  });

  it('passes quoted dates through unchanged', async () => {
    const r = await fd.parse('---\ndate: "Jan 2, 2026"\n---\nx');
    expect(r.metadata.date).toBe('Jan 2, 2026');
  });
});

describe('footnote links beat colliding author ids', () => {
  it('points footnote refs at the footnote even when a heading slug is fn-1', async () => {
    const { html } = await new Featherdown().parse('Text[^1]\n\n## fn 1\n\n[^1]: note\n');
    expect(html).toContain('<h2 id="fn-1">');
    expect(html).toMatch(/<a href="#user-content-fn-1"[^>]*data-footnote-ref/);
    expect(html).toContain('href="#user-content-fnref-1"');
  });
});

describe('author ids colliding with footnote ids', () => {
  it('renames a custom heading id that would duplicate a footnote id', async () => {
    const r = await new Featherdown().parse('## Top {#fn-1}\n\nText[^1]\n\n[^1]: note\n');
    const ids = [...r.html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(r.html).toContain('<li id="user-content-fn-1">');
    expect(r.html).toMatch(/<h2 id="user-content-fn-1-1"/);
    expect(r.toc[0]?.id).toBe('user-content-fn-1-1');
    expect(r.html).toMatch(/<h2 id="user-content-fn-1-1"><a [^>]*href="#user-content-fn-1-1"/);
    expect(r.html).toMatch(/<a href="#user-content-fn-1"[^>]*data-footnote-ref/);
  });

  it('renames raw elements colliding with fnref ids', async () => {
    const { html } = await new Featherdown().parse('<div id="fnref-1">x</div>\n\nText[^1]\n\n[^1]: note\n');
    expect(html).toContain('id="user-content-fnref-1-1"');
    expect(html).toContain('href="#user-content-fnref-1"');
    expect(html.match(/id="user-content-fnref-1"/g)).toHaveLength(1);
  });
});
