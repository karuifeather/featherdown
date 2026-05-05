import { describe, expect, it } from 'vitest';
import { Featherdown } from '../src/featherdown.js';
import {
  createMarkdownProcessor,
  parseMarkdownFile,
  renderMarkdown,
  renderMarkdownDocument,
  renderMarkdownToHtml,
} from '../src/index.js';
import { Featherdown as NodeFeatherdown, renderMarkdownToHtmlWithMermaid } from '../src/node.js';

describe('legacy API return shapes', () => {
  it('renderMarkdownToHtml returns a string', async () => {
    const html = await renderMarkdownToHtml('# Hello');
    expect(typeof html).toBe('string');
    expect(html).toContain('<h1');
  });

  it('renderMarkdown returns html and diagnostics only', async () => {
    const result = await renderMarkdown('# Hello');
    expect(typeof result.html).toBe('string');
    expect(Array.isArray(result.diagnostics)).toBe(true);
    expect(Object.keys(result).sort()).toEqual(['diagnostics', 'html']);
    expect('toc' in result).toBe(false);
  });

  it('renderMarkdownDocument returns legacy document fields only', async () => {
    const result = await renderMarkdownDocument('# Hello');
    expect(result).toHaveProperty('html');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('toc');
    expect(result).toHaveProperty('headings');
    expect(result).toHaveProperty('excerpt');
    expect(result).toHaveProperty('wordCount');
    expect(result).toHaveProperty('estimatedReadingMinutes');
    expect('frontmatter' in result).toBe(false);
    expect('assets' in result).toBe(false);
  });

  it('parseMarkdownFile returns legacy frontMatter/content shape', () => {
    const markdownWithFrontMatter = ['---', 'title: T', '---', '', '# Body', ''].join('\n');
    const result = parseMarkdownFile(markdownWithFrontMatter);
    expect(result).toHaveProperty('frontMatter');
    expect(result).toHaveProperty('content');
    expect('frontmatter' in result).toBe(false);
    expect('html' in result).toBe(false);
  });

  it('createMarkdownProcessor runs the default pipeline', async () => {
    const processor = createMarkdownProcessor();
    const file = await processor.process('# Hello');
    expect(String(file)).toContain('<h1');
  });

  it('renderMarkdownToHtmlWithMermaid returns a string', async () => {
    const html = await renderMarkdownToHtmlWithMermaid('# Hi\n');
    expect(typeof html).toBe('string');
    expect(html).toContain('Hi');
  });
});

describe('Featherdown vs legacy document parity', () => {
  const markdown = ['# Title', '', 'Paragraph **bold**.', '', '```ts', 'const n = 1;', '```', ''].join('\n');

  it('matches renderMarkdownDocument for html, headings, and toc', async () => {
    const legacy = await renderMarkdownDocument(markdown);
    const modern = await new Featherdown().parse(markdown);
    expect(modern.html).toBe(legacy.html);
    expect(modern.headings).toEqual(legacy.headings);
    expect(modern.toc).toEqual(legacy.toc);
  });

  it('renderMarkdownToHtml matches Featherdown.parse html', async () => {
    const html = await renderMarkdownToHtml(markdown);
    const modern = await new Featherdown().parse(markdown);
    expect(html).toBe(modern.html);
  });
});

describe('Node Mermaid legacy helper vs Node Featherdown', () => {
  it('produces identical html for a mermaid fence when using svg render', async () => {
    const md = ['```mermaid', 'graph TD', '  A-->B', '```', ''].join('\n');
    const legacyHtml = await renderMarkdownToHtmlWithMermaid(md);
    const modern = await new NodeFeatherdown({ mermaid: { render: 'svg' } }).parse(md);
    expect(modern.html).toBe(legacyHtml);
    expect(legacyHtml).toContain('<svg');
  }, 30_000);
});
