import { describe, expect, it } from 'vitest';
import * as root from '../src/index.js';
import * as legacy from '../src/legacy.js';
import * as advanced from '../src/advanced.js';

describe('featherdown/legacy entry', () => {
  it('exposes the same helper functions as the deprecated root re-exports', () => {
    expect(legacy.renderMarkdown).toBe(root.renderMarkdown);
    expect(legacy.renderMarkdownDocument).toBe(root.renderMarkdownDocument);
    expect(legacy.renderMarkdownToHtml).toBe(root.renderMarkdownToHtml);
    expect(legacy.parseMarkdownFile).toBe(root.parseMarkdownFile);
  });

  it('keeps deprecated root advanced re-exports identical to featherdown/advanced', () => {
    expect(root.createMarkdownProcessor).toBe(advanced.createMarkdownProcessor);
    expect(root.rehypeChartBlocks).toBe(advanced.rehypeChartBlocks);
    expect(root.rehypeCdnImages).toBe(advanced.rehypeCdnImages);
  });

  it('renders through the legacy helper', async () => {
    const html = await legacy.renderMarkdownToHtml('# Hi\n');
    expect(html).toContain('<h1 id="hi">');
  });
});
