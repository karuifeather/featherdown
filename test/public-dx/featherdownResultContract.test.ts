import { describe, expect, it } from 'vitest';
import { Featherdown } from '../../src/featherdown.js';

const sampleMarkdown = ['# Doc', '', 'Intro paragraph for excerpt.', '', 'More text.'].join('\n');

describe('FeatherdownResult public contract', () => {
  it('exposes stable top-level fields and asset feature booleans', async () => {
    const result = await new Featherdown().parse(sampleMarkdown);

    expect(typeof result.html).toBe('string');
    expect(Array.isArray(result.diagnostics)).toBe(true);
    expect(Array.isArray(result.toc)).toBe(true);
    expect(Array.isArray(result.headings)).toBe(true);
    expect(result).toHaveProperty('excerpt');
    expect(typeof result.wordCount).toBe('number');
    expect(typeof result.estimatedReadingMinutes).toBe('number');
    expect(typeof result.body).toBe('string');
    expect(typeof result.frontmatter).toBe('object');
    expect(typeof result.metadata).toBe('object');
    expect(typeof result.stats.wordCount).toBe('number');
    expect(typeof result.stats.readingTimeMinutes).toBe('number');
    expect(Array.isArray(result.assets.styles)).toBe(true);
    expect(Array.isArray(result.assets.scripts)).toBe(true);
    expect(typeof result.assets.features.math).toBe('boolean');
    expect(typeof result.assets.features.code).toBe('boolean');
    expect(typeof result.assets.features.charts).toBe('boolean');
    expect(typeof result.assets.features.mermaid).toBe('boolean');
  });
});
