import { describe, expect, it } from 'vitest';
import { buildTocTree, filterTocByDepth } from '../src/internal/buildFeatherdownResult.js';
import { buildMetadataFromFrontmatter } from '../src/internal/buildMetadataFromFrontmatter.js';
import { Featherdown } from '../src/featherdown.js';
import { Featherdown as NodeFeatherdown } from '../src/node.js';
import { detectFeatures } from '../src/internal/renderMarkdownDocumentInternal.js';
import type { Root } from 'hast';
import { renderMarkdownDocument } from '../src/legacy.js';

const doc = ['# One', '', '## Two', '', '### Three', '', '#### Four', '', '## Five', ''].join('\n');

describe('toc depth range', () => {
  it('filters toc and tocTree but not headings', async () => {
    const r = await new Featherdown({ headings: { minDepth: 2, maxDepth: 3 } }).parse(doc);
    expect(r.toc.map((t) => t.text)).toEqual(['Two', 'Three', 'Five']);
    expect(r.headings.map((h) => h.text)).toEqual(['One', 'Two', 'Three', 'Four', 'Five']);
    expect(r.tocTree.map((t) => t.text)).toEqual(['Two', 'Five']);
    expect(r.tocTree[0]?.children.map((t) => t.text)).toEqual(['Three']);
  });

  it('swaps bounds when minDepth > maxDepth', async () => {
    const r = await new Featherdown({ headings: { minDepth: 3, maxDepth: 2 } }).parse(doc);
    expect(r.toc.map((t) => t.text)).toEqual(['Two', 'Three', 'Five']);
    const items = [
      { depth: 1, text: 'a', id: 'a' },
      { depth: 4, text: 'b', id: 'b' },
    ];
    expect(filterTocByDepth(items, 4, 1)).toHaveLength(2);
  });

  it('returns empty tocTree when toc is off', async () => {
    const r = await new Featherdown({ headings: { toc: false } }).parse(doc);
    expect(r.toc).toEqual([]);
    expect(r.tocTree).toEqual([]);
    const off = await new Featherdown({ headings: false }).parse(doc);
    expect(off.tocTree).toEqual([]);
  });
});

describe('buildTocTree', () => {
  const item = (depth: number, text: string) => ({ depth, text, id: text });

  it('nests skipped levels under the nearest shallower heading', () => {
    const tree = buildTocTree([item(2, 'a'), item(4, 'b'), item(3, 'c')]);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.children.map((c) => c.text)).toEqual(['b', 'c']);
  });

  it('handles a document starting with deeper headings', () => {
    const tree = buildTocTree([item(3, 'a'), item(2, 'b'), item(3, 'c')]);
    expect(tree.map((t) => t.text)).toEqual(['a', 'b']);
    expect(tree[1]?.children.map((c) => c.text)).toEqual(['c']);
  });

  it('is empty for an empty toc', () => {
    expect(buildTocTree([])).toEqual([]);
  });
});

describe('metadata', () => {
  it('derives draft', () => {
    expect(buildMetadataFromFrontmatter({ draft: true }).draft).toBe(true);
    expect(buildMetadataFromFrontmatter({ draft: false }).draft).toBe(false);
    expect(buildMetadataFromFrontmatter({ status: 'draft' }).draft).toBe(true);
    expect(buildMetadataFromFrontmatter({ status: 'draft', draft: false }).draft).toBe(false);
    expect(buildMetadataFromFrontmatter({ status: 'published' }).draft).toBeUndefined();
    expect(buildMetadataFromFrontmatter({ draft: 'yes' }).draft).toBeUndefined();
  });

  it('normalizes categories and tags', () => {
    expect(buildMetadataFromFrontmatter({ categories: 'a' }).categories).toEqual(['a']);
    expect(buildMetadataFromFrontmatter({ categories: ['a', 'b'] }).categories).toEqual(['a', 'b']);
    expect(buildMetadataFromFrontmatter({ categories: ['a', 1] }).categories).toBeUndefined();
    expect(buildMetadataFromFrontmatter({ tags: 'solo' }).tags).toEqual(['solo']);
    expect(buildMetadataFromFrontmatter({ tags: ['a', 2] }).tags).toBeUndefined();
  });

  it('resolves image aliases and object forms', () => {
    expect(buildMetadataFromFrontmatter({ image: '/a.png' }).image).toBe('/a.png');
    expect(buildMetadataFromFrontmatter({ cover: '/c.png' }).image).toBe('/c.png');
    expect(buildMetadataFromFrontmatter({ ogImage: '/o.png' }).image).toBe('/o.png');
    expect(buildMetadataFromFrontmatter({ image: 5, cover: '/c.png' }).image).toBe('/c.png');
    expect(buildMetadataFromFrontmatter({ image: { src: '/s.png' } }).image).toBe('/s.png');
    expect(buildMetadataFromFrontmatter({ cover: { url: '/u.png' } }).image).toBe('/u.png');
    expect(buildMetadataFromFrontmatter({ image: { alt: 'x' } }).image).toBeUndefined();
  });

  it('resolves canonical, slug, lang aliases', () => {
    expect(buildMetadataFromFrontmatter({ canonicalUrl: 'https://x.dev/a' }).canonical).toBe('https://x.dev/a');
    expect(buildMetadataFromFrontmatter({ canonical_url: 'https://x.dev/b' }).canonical).toBe('https://x.dev/b');
    expect(buildMetadataFromFrontmatter({ slug: 'my-post', language: 'en' })).toMatchObject({
      slug: 'my-post',
      lang: 'en',
    });
    expect(buildMetadataFromFrontmatter({ slug: 3 }).slug).toBeUndefined();
  });

  it('parses keywords', () => {
    expect(buildMetadataFromFrontmatter({ keywords: ' a, b ,, c ' }).keywords).toEqual(['a', 'b', 'c']);
    expect(buildMetadataFromFrontmatter({ keywords: ['x', 'y'] }).keywords).toEqual(['x', 'y']);
    expect(buildMetadataFromFrontmatter({ keywords: ' , ' }).keywords).toBeUndefined();
    expect(buildMetadataFromFrontmatter({ keywords: 4 }).keywords).toBeUndefined();
  });

  it('falls back to summary/excerpt for description and prefers description', () => {
    expect(buildMetadataFromFrontmatter({ summary: 's' }).description).toBe('s');
    expect(buildMetadataFromFrontmatter({ excerpt: 'e' }).description).toBe('e');
    expect(buildMetadataFromFrontmatter({ description: 'd', summary: 's' }).description).toBe('d');
  });

  it('handles updated aliases and Date values', async () => {
    expect(buildMetadataFromFrontmatter({ lastmod: '2026-01-02' }).updated).toBe('2026-01-02');
    expect(buildMetadataFromFrontmatter({ modified: new Date('2026-03-04T00:00:00Z') }).updated).toBe('2026-03-04');
    expect(buildMetadataFromFrontmatter({ updated: '2026-05-06', lastmod: '2026-01-01' }).updated).toBe('2026-05-06');
    const r = await new Featherdown({ frontmatter: 'auto' }).parse('---\nlastmod: 2026-07-08\ndraft: true\n---\n# Hi\n');
    expect(r.metadata).toMatchObject({ updated: '2026-07-08', draft: true });
  });
});

describe('content-based asset hints', () => {
  const base = 'featherdown/styles/base.css';

  it('reports nothing for a plain document', async () => {
    const r = await new Featherdown().parse('# Hi\n\nJust text.\n');
    expect(r.assets.styles).toEqual([base]);
    expect(r.assets.features).toEqual({ math: false, code: false, charts: false, mermaid: false, embeds: false, tabs: false });
  });

  it('detects math, code, charts', async () => {
    const md = [
      '$x^2$',
      '',
      '```ts',
      'const a = 1;',
      '```',
      '',
      '```chart-line',
      '{"labels":["a"],"datasets":[]}',
      '```',
      '',
    ].join('\n');
    const r = await new Featherdown().parse(md);
    expect(r.assets.features).toMatchObject({ math: true, code: true, charts: true });
    expect(r.assets.styles).toEqual([
      base,
      'featherdown/styles/katex.css',
      'featherdown/styles/code.css',
      'featherdown/styles/highlight.css',
    ]);
  });

  it('math only, and code only', async () => {
    const m = await new Featherdown().parse('$x$\n');
    expect(m.assets.styles).toEqual([base, 'featherdown/styles/katex.css']);
    const c = await new Featherdown().parse('```js\n1\n```\n');
    expect(c.assets.styles).toEqual([base, 'featherdown/styles/code.css', 'featherdown/styles/highlight.css']);
  });

  it('a chart block alone does not count as code', async () => {
    const r = await new Featherdown().parse('```chart-line\n{"labels":["a"],"datasets":[]}\n```\n');
    expect(r.assets.features).toMatchObject({ charts: true, code: false });
  });

  it('detects iframes in the HAST as embeds (and respects the embeds option)', async () => {
    const root: Root = {
      type: 'root',
      children: [{ type: 'element', tagName: 'iframe', properties: { src: 'https://example.com' }, children: [] }],
    };
    expect(detectFeatures(root).embeds).toBe(true);
    expect(detectFeatures({ type: 'root', children: [] }).embeds).toBe(false);
    // Embeds are off by default, so no iframe is ever rendered and the hint stays false.
    const r = await new Featherdown().parse('# Hi\n');
    expect(r.assets.features.embeds).toBe(false);
  });

  it('detects mermaid only when SVG is rendered', async () => {
    const md = '```mermaid\ngraph TD\n  A-->B\n```\n';
    const node = await new NodeFeatherdown({ mermaid: { render: 'svg' } }).parse(md);
    expect(node.assets.features.mermaid).toBe(true);
    const plain = await new NodeFeatherdown({ mermaid: { render: 'svg' } }).parse('# no diagram\n');
    expect(plain.assets.features.mermaid).toBe(false);
    const browser = await new Featherdown().parse(md);
    expect(browser.assets.features.mermaid).toBe(false);
  }, 30_000);

  it('legacy document result has no detected field', async () => {
    const r = await renderMarkdownDocument('$x$\n\n```js\n1\n```\n');
    expect(Object.keys(r).sort()).toEqual([
      'diagnostics',
      'estimatedReadingMinutes',
      'excerpt',
      'headings',
      'html',
      'toc',
      'wordCount',
    ]);
  });
});
