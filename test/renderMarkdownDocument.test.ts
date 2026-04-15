import { describe, expect, it } from 'vitest';
import {
  renderMarkdown,
  renderMarkdownDocument,
  renderMarkdownToHtml,
} from '../src/index.js';

describe('renderMarkdownDocument', () => {
  it('returns html and document metadata for a normal document', async () => {
    const markdown = ['# Title', '', 'First paragraph for excerpt text.', '', '## Details', 'More words here.', ''].join('\n');

    const result = await renderMarkdownDocument(markdown);

    expect(result.html).toContain('<h1 id="title"><a href="#title">Title</a></h1>');
    expect(result.html).toContain('<p>First paragraph for excerpt text.</p>');
    expect(result.diagnostics).toEqual([]);
    expect(result.toc).toEqual([
      { depth: 1, text: 'Title', id: 'title' },
      { depth: 2, text: 'Details', id: 'details' },
    ]);
    expect(result.excerpt).toBe('First paragraph for excerpt text.');
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.estimatedReadingMinutes).toBe(1);
  });

  it('reflects final heading ids and text in TOC', async () => {
    const result = await renderMarkdownDocument('## Section One\n');
    expect(result.toc).toEqual([{ depth: 2, text: 'Section One', id: 'section-one' }]);
  });

  it('uses distinct duplicate heading ids that match rendered output', async () => {
    const result = await renderMarkdownDocument('## Hello\n\n## Hello\n');

    expect(result.toc).toEqual([
      { depth: 2, text: 'Hello', id: 'hello' },
      { depth: 2, text: 'Hello', id: 'hello-1' },
    ]);
    expect(result.html).toContain('<h2 id="hello"><a href="#hello">Hello</a></h2>');
    expect(result.html).toContain('<h2 id="hello-1"><a href="#hello-1">Hello</a></h2>');
  });

  it('reflects custom heading ids in TOC', async () => {
    const result = await renderMarkdownDocument('## My Title {#custom-slug}\n');
    expect(result.toc).toEqual([
      { depth: 2, text: 'My Title', id: 'user-content-custom-slug' },
    ]);
  });

  it('uses the first meaningful paragraph as excerpt and not headings', async () => {
    const markdown = ['# Headline', '', '   ', '', '> Quoted lead paragraph.', '', 'Regular paragraph.', ''].join('\n');
    const result = await renderMarkdownDocument(markdown);
    expect(result.excerpt).toBe('Quoted lead paragraph.');
  });

  it('uses list item text as excerpt when it appears first', async () => {
    const markdown = ['- First list summary', '- Second item', '', 'Later paragraph.', ''].join('\n');
    const result = await renderMarkdownDocument(markdown);
    expect(result.excerpt).toBe('First list summary');
  });

  it('returns null excerpt when no suitable paragraph-like text exists', async () => {
    const markdown = ['# Heading Only', '', '```chart-line', '{"labels":["a"],"datasets":[]}', '```', ''].join('\n');
    const result = await renderMarkdownDocument(markdown);
    expect(result.excerpt).toBeNull();
  });

  it('returns deterministic word count and reading minutes', async () => {
    const markdown = ['# Headline', '', 'One two three four five six seven eight nine ten.', ''].join('\n');
    const result = await renderMarkdownDocument(markdown);
    expect(result.wordCount).toBe(11);
    expect(result.estimatedReadingMinutes).toBe(1);
  });

  it('returns zero words and zero reading minutes when no readable text exists', async () => {
    const markdown = '![Alt text](https://example.com/image.png)\n';
    const result = await renderMarkdownDocument(markdown);
    expect(result.wordCount).toBe(0);
    expect(result.estimatedReadingMinutes).toBe(0);
  });

  it('includes diagnostics for chart and image warning cases', async () => {
    const markdown = ['```chart-line', 'not json', '```', '', '![Logo](./images/logo.png)', ''].join('\n');

    const result = await renderMarkdownDocument(markdown, {
      kind: 'post',
      slug: 'hello-world',
      manifest: { map: {} },
    });

    expect(result.diagnostics).toEqual([
      {
        code: 'chart.invalid_json',
        message: 'Chart JSON could not be parsed for type "line".',
        severity: 'warning',
        source: 'chart',
      },
      {
        code: 'images.manifest_miss',
        message: 'No manifest entry found for "post/hello-world/images/logo.png".',
        severity: 'warning',
        source: 'images',
      },
    ]);
  });

  it('keeps existing render APIs behavior unchanged', async () => {
    const markdown = '# Hello\n';
    const html = await renderMarkdownToHtml(markdown);
    const withDiagnostics = await renderMarkdown(markdown);

    expect(html).toBe('<h1 id="hello"><a href="#hello">Hello</a></h1>');
    expect(withDiagnostics).toEqual({
      html: '<h1 id="hello"><a href="#hello">Hello</a></h1>',
      diagnostics: [],
    });
  });
});
