import assert from 'node:assert/strict';

const root = await import('../dist/index.js');
const nodeOnly = await import('../dist/node.js');

assert.equal(typeof root.renderMarkdownToHtml, 'function');
assert.equal(typeof root.renderMarkdown, 'function');
assert.equal(typeof root.createMarkdownProcessor, 'function');
assert.equal(typeof root.rehypeChartBlocks, 'function');
assert.equal(typeof root.rehypeCdnImages, 'function');
assert.equal(typeof root.parseMarkdownFile, 'function');

assert.equal(typeof nodeOnly.renderMarkdownToHtmlWithMermaid, 'function');

assert.equal(
  root.libraryId(),
  'blog-pipeline',
  'Public package entry should resolve and execute correctly.',
);

console.log('Export smoke checks passed.');
