import { describe, expect, it } from 'vitest';
import { renderMarkdownDocument } from '../../src/renderMarkdownDocument.js';

/**
 * Ensures the legacy document API does not accidentally grow into FeatherdownResult.
 */
describe('renderMarkdownDocument legacy shape lock', () => {
  it('returns only document fields (no body, stats, assets, frontmatter, metadata)', async () => {
    const result = await renderMarkdownDocument('# Hello\n');
    const keys = Object.keys(result).sort();
    expect(keys).toEqual([
      'diagnostics',
      'estimatedReadingMinutes',
      'excerpt',
      'headings',
      'html',
      'toc',
      'wordCount',
    ]);
    expect('stats' in result).toBe(false);
    expect('assets' in result).toBe(false);
    expect('body' in result).toBe(false);
    expect('frontmatter' in result).toBe(false);
    expect('metadata' in result).toBe(false);
  });
});
