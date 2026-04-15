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
    expect(result.headings).toEqual([
      { index: 0, depth: 1, text: 'Title', id: 'title', hasCustomId: false },
      { index: 1, depth: 2, text: 'Details', id: 'details', hasCustomId: false },
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
    expect(result.headings).toEqual([
      { index: 0, depth: 2, text: 'Hello', id: 'hello', hasCustomId: false },
      { index: 1, depth: 2, text: 'Hello', id: 'hello-1', hasCustomId: false },
    ]);
    expect(result.html).toContain('<h2 id="hello"><a href="#hello">Hello</a></h2>');
    expect(result.html).toContain('<h2 id="hello-1"><a href="#hello-1">Hello</a></h2>');
  });

  it('reflects custom heading ids in TOC', async () => {
    const result = await renderMarkdownDocument('## My Title {#custom-slug}\n');
    expect(result.toc).toEqual([
      { depth: 2, text: 'My Title', id: 'user-content-custom-slug' },
    ]);
    expect(result.headings).toEqual([
      {
        index: 0,
        depth: 2,
        text: 'My Title',
        id: 'user-content-custom-slug',
        hasCustomId: true,
      },
    ]);
    expect(result.html).not.toContain('data-heading-custom-id');
  });

  it('marks slug-generated heading ids with hasCustomId false', async () => {
    const result = await renderMarkdownDocument('## Section One\n');
    expect(result.headings).toEqual([
      { index: 0, depth: 2, text: 'Section One', id: 'section-one', hasCustomId: false },
    ]);
  });

  it('keeps toc output unchanged while returning richer headings metadata', async () => {
    const result = await renderMarkdownDocument(['# One', '', '## Two {#two-id}', ''].join('\n'));
    expect(result.toc).toEqual([
      { depth: 1, text: 'One', id: 'one' },
      { depth: 2, text: 'Two', id: 'user-content-two-id' },
    ]);
    expect(result.headings).toEqual([
      { index: 0, depth: 1, text: 'One', id: 'one', hasCustomId: false },
      {
        index: 1,
        depth: 2,
        text: 'Two',
        id: 'user-content-two-id',
        hasCustomId: true,
      },
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

  it('keeps document metadata behavior when titled code blocks are present', async () => {
    const markdown = [
      '# Title',
      '',
      'Intro paragraph.',
      '',
      '```ts title="example.ts"',
      'const value = 1;',
      '```',
      '',
      '## Section',
      'More text.',
      '',
    ].join('\n');
    const result = await renderMarkdownDocument(markdown);
    expect(result.html).toContain('<div class="code-block"><div class="code-block-title">example.ts</div>');
    expect(result.toc).toEqual([
      { depth: 1, text: 'Title', id: 'title' },
      { depth: 2, text: 'Section', id: 'section' },
    ]);
    expect(result.excerpt).toBe('Intro paragraph.');
    expect(result.diagnostics).toEqual([]);
  });

  it('keeps document metadata behavior when code line highlights are present', async () => {
    const markdown = [
      '# Title',
      '',
      'Intro paragraph.',
      '',
      '```ts {2}',
      'const a = 1;',
      'const b = 2;',
      '```',
      '',
      '## Section',
      'More text.',
      '',
    ].join('\n');
    const result = await renderMarkdownDocument(markdown);
    expect(result.html).toContain('<span class="code-line code-line-highlighted"><span class="hljs-keyword">const</span> b = <span class="hljs-number">2</span>;</span>');
    expect(result.toc).toEqual([
      { depth: 1, text: 'Title', id: 'title' },
      { depth: 2, text: 'Section', id: 'section' },
    ]);
    expect(result.excerpt).toBe('Intro paragraph.');
    expect(result.diagnostics).toEqual([]);
  });

  it('keeps document metadata behavior when numbered code blocks are present', async () => {
    const markdown = [
      '# Title',
      '',
      'Intro paragraph.',
      '',
      '```ts showLineNumbers',
      'const a = 1;',
      'const b = 2;',
      '```',
      '',
      '## Section',
      'More text.',
      '',
    ].join('\n');
    const result = await renderMarkdownDocument(markdown);
    expect(result.html).toContain('<code class="hljs language-ts code-line-numbered">');
    expect(result.html).toContain('<span class="code-line-number">1</span>');
    expect(result.toc).toEqual([
      { depth: 1, text: 'Title', id: 'title' },
      { depth: 2, text: 'Section', id: 'section' },
    ]);
    expect(result.excerpt).toBe('Intro paragraph.');
    expect(result.diagnostics).toEqual([]);
  });

  it('keeps document metadata behavior when copyable code blocks are present', async () => {
    const markdown = [
      '# Title',
      '',
      'Intro paragraph.',
      '',
      '```ts showCopyButton',
      'const a = 1;',
      '```',
      '',
      '## Section',
      'More text.',
      '',
    ].join('\n');
    const result = await renderMarkdownDocument(markdown);
    expect(result.html).toContain('<div class="code-block code-block-copyable">');
    expect(result.html).toContain('<button type="button" class="code-block-copy-button" data-code-copy=""');
    expect(result.toc).toEqual([
      { depth: 1, text: 'Title', id: 'title' },
      { depth: 2, text: 'Section', id: 'section' },
    ]);
    expect(result.excerpt).toBe('Intro paragraph.');
    expect(result.diagnostics).toEqual([]);
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

  it('keeps chart/image behavior unchanged when callouts are present', async () => {
    const markdown = [
      ':::info',
      'Inside callout',
      ':::',
      '',
      '![Logo](./images/logo.png)',
      '',
      '```chart-line',
      '{"labels":["a"],"datasets":[]}',
      '```',
      '',
    ].join('\n');

    const result = await renderMarkdownDocument(markdown, {
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

    expect(result.html).toContain('<div class="callout callout-info"><div class="callout-title">Info</div>');
    expect(result.html).toContain(
      '<img src="https://cdn.example.com/blog/hello-world/logo.hash.png" alt="Logo" class="markdown-inline-img">',
    );
    expect(result.html).toContain('<div class="chart-mount" data-chart="line"');
    expect(result.diagnostics).toEqual([]);
  });

  it('renders callouts correctly through renderMarkdownDocument output and metadata', async () => {
    const markdown = ['# Title', '', ':::note[Custom title]', 'Body text in callout.', ':::', ''].join('\n');
    const result = await renderMarkdownDocument(markdown);

    expect(result.html).toContain('<div class="callout callout-note">');
    expect(result.html).toContain('<div class="callout-title">Custom title</div>');
    expect(result.html).toContain('<p>Body text in callout.</p>');
    expect(result.toc).toEqual([{ depth: 1, text: 'Title', id: 'title' }]);
    expect(result.excerpt).toBe('Body text in callout.');
    expect(result.diagnostics).toEqual([]);
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
