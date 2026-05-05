import { describe, expect, it } from 'vitest';
import { buildFeatherdownResult } from '../src/internal/buildFeatherdownResult.js';
import { resolveFeatherdownOptions } from '../src/internal/resolveFeatherdownOptions.js';
import type { RenderMarkdownDocumentResult } from '../src/types.js';

const sampleDocument = (): RenderMarkdownDocumentResult => ({
  html: '<p>ok</p>',
  diagnostics: [
    {
      code: 'images.manifest_miss',
      message: 'miss',
      severity: 'warning',
      source: 'images',
    },
  ],
  toc: [{ depth: 1, text: 'Title', id: 'title' }],
  headings: [
    { index: 0, depth: 1, text: 'Title', id: 'title', hasCustomId: false },
  ],
  excerpt: 'Lead text',
  wordCount: 42,
  estimatedReadingMinutes: 1,
});

describe('buildFeatherdownResult', () => {
  it('zeros publishing fields when publishing is fully disabled', () => {
    const resolved = resolveFeatherdownOptions({ publishing: false });
    const result = buildFeatherdownResult({
      body: '# Title\n\nBody.\n',
      frontmatter: {},
      metadata: {},
      document: sampleDocument(),
      options: resolved,
    });
    expect(result.excerpt).toBeNull();
    expect(result.wordCount).toBe(0);
    expect(result.estimatedReadingMinutes).toBe(0);
    expect(result.stats.wordCount).toBe(0);
    expect(result.stats.readingTimeMinutes).toBe(0);
  });

  it('clears diagnostics when diagnostics are disabled', () => {
    const resolved = resolveFeatherdownOptions({ diagnostics: false });
    const result = buildFeatherdownResult({
      body: 'x',
      frontmatter: {},
      metadata: {},
      document: sampleDocument(),
      options: resolved,
    });
    expect(result.diagnostics).toEqual([]);
  });

  it('clears headings and toc when headings are disabled', () => {
    const resolved = resolveFeatherdownOptions({ headings: false });
    const result = buildFeatherdownResult({
      body: '## A\n',
      frontmatter: {},
      metadata: {},
      document: sampleDocument(),
      options: resolved,
    });
    expect(result.headings).toEqual([]);
    expect(result.toc).toEqual([]);
  });

  it('reports selective style assets by default', () => {
    const resolved = resolveFeatherdownOptions({});
    const result = buildFeatherdownResult({
      body: '# Hi\n',
      frontmatter: {},
      metadata: {},
      document: sampleDocument(),
      options: resolved,
    });
    expect(result.assets.styles).toEqual([
      'featherdown/styles/base.css',
      'featherdown/styles/katex.css',
      'featherdown/styles/code.css',
      'featherdown/styles/highlight.css',
    ]);
  });

  it('omits katex.css from assets when math is off', () => {
    const resolved = resolveFeatherdownOptions({ math: false });
    const result = buildFeatherdownResult({
      body: 'x',
      frontmatter: {},
      metadata: {},
      document: sampleDocument(),
      options: resolved,
    });
    expect(result.assets.styles).toEqual([
      'featherdown/styles/base.css',
      'featherdown/styles/code.css',
      'featherdown/styles/highlight.css',
    ]);
  });

  it('omits code.css and highlight.css from assets when code is off', () => {
    const resolved = resolveFeatherdownOptions({ code: false });
    const result = buildFeatherdownResult({
      body: 'x',
      frontmatter: {},
      metadata: {},
      document: sampleDocument(),
      options: resolved,
    });
    expect(result.assets.styles).toEqual(['featherdown/styles/base.css', 'featherdown/styles/katex.css']);
  });

  it('omits highlight.css when code highlighting is off', () => {
    const resolved = resolveFeatherdownOptions({
      code: { enabled: true, highlighting: false },
    });
    const result = buildFeatherdownResult({
      body: 'x',
      frontmatter: {},
      metadata: {},
      document: sampleDocument(),
      options: resolved,
    });
    expect(result.assets.styles).toEqual([
      'featherdown/styles/base.css',
      'featherdown/styles/katex.css',
      'featherdown/styles/code.css',
    ]);
  });

  it('sets assets.features.mermaid when mermaidFeature is true', () => {
    const resolved = resolveFeatherdownOptions({});
    const result = buildFeatherdownResult({
      body: 'x',
      frontmatter: {},
      metadata: {},
      document: sampleDocument(),
      options: resolved,
      mermaidFeature: true,
    });
    expect(result.assets.features.mermaid).toBe(true);
  });
});
