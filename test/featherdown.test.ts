import { describe, expect, it } from 'vitest';
import { Featherdown, FeatherdownDiagnosticsError, renderMarkdownDocument } from '../src/index.js';
import type { FeatherdownMetadata } from '../src/types.js';

describe('Featherdown', () => {
  it('parses basic markdown with expected html and diagnostics', async () => {
    const featherdown = new Featherdown();
    const result = await featherdown.parse('# Hello');

    expect(result.html).toContain('<h1');
    expect(result.html).toContain('Hello');
    expect(result.diagnostics).toEqual(expect.any(Array));
  });

  it('returns the extended FeatherdownResult shape with placeholder fields', async () => {
    const originalMarkdown = '# Title\n\nBody text.\n';
    const featherdown = new Featherdown();
    const result = await featherdown.parse(originalMarkdown);

    expect(result.html).toBeDefined();
    expect(result.diagnostics).toBeDefined();
    expect(result.toc).toBeDefined();
    expect(result.headings).toBeDefined();
    expect(result.excerpt).toBeDefined();
    expect(result.wordCount).toBeDefined();
    expect(result.estimatedReadingMinutes).toBeDefined();
    expect(result.body).toBeDefined();
    expect(result.frontmatter).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(result.stats).toBeDefined();
    expect(result.assets).toBeDefined();

    expect(result.body).toBe(originalMarkdown);
    expect(result.frontmatter).toEqual({});
    expect(result.metadata).toEqual({});
    expect(result.stats.wordCount).toBe(result.wordCount);
    expect(result.stats.readingTimeMinutes).toBe(result.estimatedReadingMinutes);
    expect(Array.isArray(result.assets.styles)).toBe(true);
    expect(Array.isArray(result.assets.scripts)).toBe(true);
    expect(result.assets.styles).toContain('featherdown/styles/base.css');
    expect(result.assets.styles).toContain('featherdown/styles/katex.css');
    expect(result.assets.styles).toContain('featherdown/styles/code.css');
    expect(result.assets.styles).toContain('featherdown/styles/highlight.css');
    expect(result.assets.styles).not.toContain('featherdown/styles.css');
    expect(result.assets.features).toEqual({
      math: true,
      code: true,
      charts: true,
      mermaid: false,
    });
  });

  it('accepts full intent-shaped options through the public constructor', async () => {
    const featherdown = new Featherdown({
      math: true,
      code: {
        highlighting: true,
        lineNumbers: true,
        copyButton: true,
      },
      sanitize: true,
      diagnostics: true,
      charts: true,
      headings: {
        slugs: true,
        anchors: true,
        toc: true,
      },
      publishing: {
        excerpt: true,
        wordCount: true,
        readingTime: true,
      },
    });
    const result = await featherdown.parse('# Hello\n');
    expect(result.html).toContain('Hello');
    expect(result.assets.features.math).toBe(true);
  });

  it('one-level merges nested code options; parse overrides constructor', async () => {
    const featherdown = new Featherdown({
      math: true,
      code: {
        lineNumbers: false,
      },
    });
    const result = await featherdown.parse('# Hi\n', {
      math: false,
      code: {
        lineNumbers: true,
      },
    });
    expect(result.assets.features.math).toBe(false);
    expect(result.assets.features.code).toBe(true);
  });

  it('returns empty diagnostics when diagnostics is false', async () => {
    const markdown = ['```chart-line', 'not json', '```', ''].join('\n');
    const result = await new Featherdown({ diagnostics: false }).parse(markdown);
    expect(result.diagnostics).toEqual([]);
  });

  it('diagnostics: true collects diagnostics and does not throw', async () => {
    const markdown = ['```chart-line', 'not json', '```', ''].join('\n');
    const result = await new Featherdown({ diagnostics: true }).parse(markdown);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0]?.code).toBe('chart.invalid_json');
  });

  it('diagnostics: "warn" collects diagnostics and does not throw', async () => {
    const markdown = ['```chart-line', 'not json', '```', ''].join('\n');
    const result = await new Featherdown({ diagnostics: 'warn' }).parse(markdown);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it('diagnostics: "strict" throws FeatherdownDiagnosticsError with diagnostics and result', async () => {
    const markdown = ['```chart-line', 'not json', '```', ''].join('\n');
    try {
      await new Featherdown({ diagnostics: 'strict' }).parse(markdown);
      expect.fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(FeatherdownDiagnosticsError);
      const err = e as FeatherdownDiagnosticsError;
      expect(err.diagnostics.length).toBeGreaterThan(0);
      expect(err.message).toMatch(/strict diagnostics failed/);
      expect(err.result).toBeDefined();
      expect(typeof err.result?.html).toBe('string');
      expect(err.result?.diagnostics).toEqual(err.diagnostics);
    }
  });

  it('diagnostics: "strict" does not throw for clean markdown', async () => {
    const result = await new Featherdown({ diagnostics: 'strict' }).parse('# Hello\n');
    expect(result.diagnostics).toEqual([]);
    expect(result.html).toContain('Hello');
  });

  it('applies diagnostics: "strict" from parse over constructor diagnostics: "warn"', async () => {
    const markdown = ['```chart-line', 'not json', '```', ''].join('\n');
    const featherdown = new Featherdown({ diagnostics: 'warn' });
    await expect(featherdown.parse(markdown, { diagnostics: 'strict' })).rejects.toBeInstanceOf(
      FeatherdownDiagnosticsError,
    );
    const warned = await featherdown.parse(markdown);
    expect(warned.diagnostics.length).toBeGreaterThan(0);
  });

  it('shallow-merges constructor options with parse options, parse wins on conflicts', async () => {
    const markdown = ['```chart-line', 'not json', '```', '', '![Logo](./images/logo.png)', ''].join('\n');

    const merged = new Featherdown({
      kind: 'post',
      manifest: { map: {} },
    });
    const result = await merged.parse(markdown, { slug: 'hello-world' });

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

  it('matches renderMarkdownDocument html output for the same markdown', async () => {
    const markdown = '# Hello\n';
    const fromClass = await new Featherdown().parse(markdown);
    const fromFn = await renderMarkdownDocument(markdown);
    expect(fromClass.html).toBe(fromFn.html);
  });

  it('omits katex.css from assets.styles when math is disabled', async () => {
    const result = await new Featherdown().parse('# Hello', { math: false });
    expect(result.assets.styles).toContain('featherdown/styles/base.css');
    expect(result.assets.styles).not.toContain('featherdown/styles/katex.css');
    expect(result.assets.styles).toContain('featherdown/styles/code.css');
    expect(result.assets.styles).toContain('featherdown/styles/highlight.css');
  });

  it('omits code.css and highlight.css from assets.styles when code is disabled', async () => {
    const result = await new Featherdown().parse('# Hello', { code: false });
    expect(result.assets.styles).toContain('featherdown/styles/base.css');
    expect(result.assets.styles).toContain('featherdown/styles/katex.css');
    expect(result.assets.styles).not.toContain('featherdown/styles/code.css');
    expect(result.assets.styles).not.toContain('featherdown/styles/highlight.css');
  });

  it('omits highlight.css when code is enabled but syntax highlighting is off', async () => {
    const result = await new Featherdown().parse('# Hello', {
      code: { enabled: true, highlighting: false },
    });
    expect(result.assets.styles).toContain('featherdown/styles/base.css');
    expect(result.assets.styles).toContain('featherdown/styles/katex.css');
    expect(result.assets.styles).toContain('featherdown/styles/code.css');
    expect(result.assets.styles).not.toContain('featherdown/styles/highlight.css');
  });

  it('reflects disabled math in assets and omits KaTeX output for inline math', async () => {
    const md = 'Inline $x$ math.\n';
    const withMath = await new Featherdown({ math: true }).parse(md);
    const withoutMath = await new Featherdown({ math: false }).parse(md);
    expect(withMath.assets.features.math).toBe(true);
    expect(withoutMath.assets.features.math).toBe(false);
    expect(withMath.html).toContain('katex');
    expect(withoutMath.html).not.toContain('katex');
  });

  it('omits chart placeholders when charts are disabled', async () => {
    const md = ['```chart-line', '{"labels":["a"],"datasets":[]}', '```', ''].join('\n');
    const result = await new Featherdown({ charts: false }).parse(md);
    expect(result.assets.features.charts).toBe(false);
    expect(result.html).not.toContain('chart-mount');
  });

  it('clears toc metadata when headings.toc is false without changing heading ids in html', async () => {
    const md = '## Section One\n';
    const result = await new Featherdown({ headings: { toc: false } }).parse(md);
    expect(result.toc).toEqual([]);
    expect(result.html).toContain('id="section-one"');
    expect(result.headings.length).toBeGreaterThan(0);
  });

  it('suppresses excerpt when publishing.excerpt is false', async () => {
    const md = ['# T', '', 'Lead paragraph.', ''].join('\n');
    const result = await new Featherdown({ publishing: { excerpt: false } }).parse(md);
    expect(result.excerpt).toBeNull();
    expect(result.html).toContain('Lead paragraph.');
  });
});

describe('FeatherdownResult', () => {
  it('includes every documented top-level property by default', async () => {
    const markdown = '# Doc\n\nParagraph.\n';
    const result = await new Featherdown().parse(markdown);
    expect(result).toHaveProperty('html');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('toc');
    expect(result).toHaveProperty('headings');
    expect(result).toHaveProperty('excerpt');
    expect(result).toHaveProperty('wordCount');
    expect(result).toHaveProperty('estimatedReadingMinutes');
    expect(result).toHaveProperty('body');
    expect(result).toHaveProperty('frontmatter');
    expect(result).toHaveProperty('metadata');
    expect(result).toHaveProperty('stats');
    expect(result).toHaveProperty('assets');
  });

  it('keeps stats in sync with top-level word count and reading minutes', async () => {
    const result = await new Featherdown().parse('# Hello\n\nOne two three four five.\n');
    expect(result.stats.wordCount).toBe(result.wordCount);
    expect(result.stats.readingTimeMinutes).toBe(result.estimatedReadingMinutes);
  });

  it('zeros excerpt, counts, and stats when publishing is false', async () => {
    const md = ['# Title', '', 'Intro paragraph for excerpt.', '', 'More words here.'].join('\n');
    const result = await new Featherdown().parse(md, { publishing: false });
    expect(result.excerpt).toBeNull();
    expect(result.wordCount).toBe(0);
    expect(result.estimatedReadingMinutes).toBe(0);
    expect(result.stats.wordCount).toBe(0);
    expect(result.stats.readingTimeMinutes).toBe(0);
  });

  it('zeros word count and reading time only when those publishing flags are off', async () => {
    const md = ['# Title', '', 'Intro paragraph.', '', 'word '.repeat(30)].join('\n');
    const result = await new Featherdown().parse(md, {
      publishing: { wordCount: false, readingTime: false },
    });
    expect(result.excerpt).not.toBeNull();
    expect(result.wordCount).toBe(0);
    expect(result.estimatedReadingMinutes).toBe(0);
    expect(result.stats.wordCount).toBe(0);
    expect(result.stats.readingTimeMinutes).toBe(0);
  });

  it('clears headings and toc when headings is false', async () => {
    const md = '## Section\n';
    const result = await new Featherdown({ headings: false }).parse(md);
    expect(result.headings).toEqual([]);
    expect(result.toc).toEqual([]);
    expect(result.html).toContain('section');
  });

  it('reflects disabled math, code, and charts in assets.features', async () => {
    const result = await new Featherdown().parse('# x\n', {
      math: false,
      code: false,
      charts: false,
    });
    expect(result.assets.features.math).toBe(false);
    expect(result.assets.features.code).toBe(false);
    expect(result.assets.features.charts).toBe(false);
    expect(result.assets.features.mermaid).toBe(false);
  });

  it('assigns excerpt, stats, and frontmatter to the documented public types', async () => {
    const result = await new Featherdown().parse('# Hello');
    const excerpt: string | null = result.excerpt;
    const wordCount: number = result.stats.wordCount;
    const frontmatter: Record<string, unknown> = result.frontmatter;
    const metadata: FeatherdownMetadata = result.metadata;
    expect(typeof wordCount).toBe('number');
    expect(frontmatter).toEqual({});
    expect(metadata).toEqual({});
    expect(excerpt === null || typeof excerpt === 'string').toBe(true);
  });
});

describe('Featherdown front matter', () => {
  const yamlDoc = [
    '---',
    'title: Hello World',
    'description: My first post',
    'tags:',
    '  - markdown',
    '  - docs',
    '---',
    '',
    '# Hello',
    '',
  ].join('\n');

  it('parses YAML, strips body, and does not render front matter into HTML with frontmatter: "auto"', async () => {
    const fd = new Featherdown({ frontmatter: 'auto' });
    const result = await fd.parse(yamlDoc);
    expect(result.frontmatter.title).toBe('Hello World');
    expect(result.frontmatter.description).toBe('My first post');
    expect(result.frontmatter.tags).toEqual(['markdown', 'docs']);
    expect(result.body.trim()).toBe('# Hello');
    expect(result.html).toContain('Hello');
    expect(result.html).not.toContain('Hello World');
    expect(result.html).not.toContain('title:');
    expect(result.metadata.title).toBe('Hello World');
    expect(result.metadata.description).toBe('My first post');
    expect(result.metadata.tags).toEqual(['markdown', 'docs']);
  });

  it('matches true and "auto" for front matter behavior', async () => {
    const auto = await new Featherdown({ frontmatter: 'auto' }).parse(yamlDoc);
    const truthy = await new Featherdown({ frontmatter: true }).parse(yamlDoc);
    expect(auto.body).toBe(truthy.body);
    expect(auto.frontmatter).toEqual(truthy.frontmatter);
  });

  it('with frontmatter: false, leaves body intact and does not populate frontmatter', async () => {
    const result = await new Featherdown({ frontmatter: false }).parse(yamlDoc);
    expect(result.body).toBe(yamlDoc);
    expect(result.frontmatter).toEqual({});
    expect(result.metadata).toEqual({});
    expect(result.html).toContain('title:');
  });

  it('with no YAML block returns empty frontmatter and metadata and original body', async () => {
    const md = '# Only heading\n';
    const result = await new Featherdown({ frontmatter: 'auto' }).parse(md);
    expect(result.frontmatter).toEqual({});
    expect(result.metadata).toEqual({});
    expect(result.body).toBe(md);
  });

  it('keeps malformed tags on frontmatter but omits tags from metadata', async () => {
    const md = ['---', 'tags: "markdown"', '---', '# Hi', ''].join('\n');
    const result = await new Featherdown({ frontmatter: 'auto' }).parse(md);
    expect(result.frontmatter.tags).toBe('markdown');
    expect(result.metadata.tags).toBeUndefined();
  });

  it('lets parse-call frontmatter override constructor', async () => {
    const fd = new Featherdown({ frontmatter: false });
    const result = await fd.parse(yamlDoc, { frontmatter: 'auto' });
    expect(result.body.trim()).toBe('# Hello');
    expect(result.frontmatter.title).toBe('Hello World');
  });

  it('uses lenient YAML: invalid front matter does not throw and leaves body unchanged', async () => {
    const bad = ['---', 'foo: [broken', '---', '# X', ''].join('\n');
    const result = await new Featherdown({ frontmatter: 'auto' }).parse(bad);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe(bad);
  });
});

describe('Featherdown instance reuse', () => {
  it('parses multiple unrelated documents without cross-document state', async () => {
    const featherdown = new Featherdown({
      frontmatter: 'auto',
      math: true,
      code: true,
    });

    const first = await featherdown.parse(
      ['---', 'title: First', '---', '', '# First', ''].join('\n'),
    );
    const second = await featherdown.parse('# Second');

    expect(first.frontmatter).toEqual({ title: 'First' });
    expect(first.metadata.title).toBe('First');
    expect(first.body.trim()).toBe('# First');

    expect(second.frontmatter).toEqual({});
    expect(second.metadata).toEqual({});
    expect(second.body).toBe('# Second');
    expect(second.html).toContain('Second');
    expect(second.html.toLowerCase()).not.toContain('first');
  });
});

describe('Featherdown option merge (constructor vs parse)', () => {
  it('applies per-call overrides with one-level nested merge (publishing, headings)', async () => {
    const markdown = [
      '---',
      'title: Post',
      '---',
      '',
      '# Title',
      '',
      'Paragraph one for excerpt and word count. Paragraph two adds more words.',
      '',
    ].join('\n');

    const featherdown = new Featherdown({
      frontmatter: false,
      publishing: {
        excerpt: false,
        wordCount: false,
        readingTime: false,
      },
      headings: {
        toc: false,
      },
    });

    const result = await featherdown.parse(markdown, {
      frontmatter: 'auto',
      publishing: {
        excerpt: true,
        wordCount: true,
      },
      headings: {
        toc: true,
      },
    });

    expect(result.frontmatter.title).toBe('Post');
    expect(result.body.trim().startsWith('# Title')).toBe(true);
    expect(result.excerpt).toBeTruthy();
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.estimatedReadingMinutes).toBe(0);
    expect(result.toc.length).toBeGreaterThan(0);
    expect(result.toc.some((t) => t.text.includes('Title'))).toBe(true);
  });
});

