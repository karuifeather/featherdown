import { describe, expect, it } from 'vitest';
import * as root from '../src/index.js';
import * as legacy from '../src/legacy.js';
import * as advanced from '../src/advanced.js';

describe('package entry points', () => {
  it('the root exports only the stable surface', () => {
    expect(Object.keys(root).sort()).toEqual(['Featherdown', 'FeatherdownDiagnosticsError', 'libraryId']);
  });

  it('featherdown/legacy exposes the pre-Featherdown helpers', () => {
    expect(Object.keys(legacy).sort()).toEqual([
      'parseMarkdownFile',
      'renderMarkdown',
      'renderMarkdownDocument',
      'renderMarkdownToHtml',
    ]);
  });

  it('featherdown/advanced exposes the processor factory and rehype plugins', () => {
    expect(Object.keys(advanced).sort()).toEqual(['createMarkdownProcessor', 'rehypeCdnImages', 'rehypeChartBlocks']);
  });

  it('renders through the legacy helper', async () => {
    const html = await legacy.renderMarkdownToHtml('# Hi\n');
    expect(html).toContain('<h1 id="hi">');
  });
});
