import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = await import('../dist/index.js');
const nodeOnly = await import('../dist/node.js');

assert.equal(typeof root.renderMarkdownToHtml, 'function');
assert.equal(typeof root.renderMarkdown, 'function');
assert.equal(typeof root.createMarkdownProcessor, 'function');
assert.equal(typeof root.rehypeChartBlocks, 'function');
assert.equal(typeof root.rehypeCdnImages, 'function');
assert.equal(typeof root.parseMarkdownFile, 'function');

assert.equal(typeof nodeOnly.renderMarkdownToHtmlWithMermaid, 'function');

const rootCode = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');
const nodeCode = await readFile(new URL('../dist/node.js', import.meta.url), 'utf8');

assert.equal(
  rootCode.includes('rehype-mermaid') || rootCode.includes('playwright'),
  false,
  'Default entry must stay free of Mermaid/Playwright paths.',
);
assert.equal(
  nodeCode.includes('rehype-mermaid'),
  true,
  'Node-only entry should include Mermaid integration.',
);

assert.equal(
  root.libraryId(),
  'featherdown',
  'Public package entry should resolve and execute correctly.',
);

console.log('Export smoke checks passed.');
