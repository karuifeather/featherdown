import type { Root as HastRoot } from 'hast';
import type { Root as MdastRoot } from 'mdast';
import { visit } from 'unist-util-visit';
import { describe, expect, it } from 'vitest';
import { Featherdown } from '../src/index.js';

function remarkShout() {
  return (tree: MdastRoot): undefined => {
    visit(tree, 'text', (node) => {
      node.value = node.value.toUpperCase();
    });
  };
}

function remarkInjectRawScript() {
  return (tree: MdastRoot): undefined => {
    tree.children.push({ type: 'html', value: '<script>alert(1)</script><p onclick="x()">raw</p>' });
  };
}

function rehypeMarkParagraphs() {
  return (tree: HastRoot): undefined => {
    visit(tree, 'element', (node) => {
      if (node.tagName === 'p') node.properties.dataTrusted = 'yes';
    });
  };
}

describe('user plugins', () => {
  it('runs remark plugins before HTML conversion', async () => {
    const { html } = await new Featherdown({ plugins: { remark: [remarkShout] } }).parse('hello');
    expect(html).toBe('<p>HELLO</p>');
  });

  it('still sanitizes output of remark plugins', async () => {
    const { html } = await new Featherdown({ plugins: { remark: [remarkInjectRawScript] } }).parse('x');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onclick');
  });

  it('runs rehype plugins after sanitize (trusted)', async () => {
    const { html } = await new Featherdown({ plugins: { rehype: [rehypeMarkParagraphs] } }).parse('x');
    expect(html).toBe('<p data-trusted="yes">x</p>');
  });

  it('does not leak plugins into instances without them', async () => {
    await new Featherdown({ plugins: { remark: [remarkShout] } }).parse('hello');
    const { html } = await new Featherdown().parse('hello');
    expect(html).toBe('<p>hello</p>');
  });

  it('concatenates constructor and per-parse plugins', async () => {
    const fd = new Featherdown({ plugins: { remark: [remarkShout] } });
    const { html } = await fd.parse('hi', { plugins: { rehype: [rehypeMarkParagraphs] } });
    expect(html).toBe('<p data-trusted="yes">HI</p>');
  });
});
