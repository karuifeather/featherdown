import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Featherdown as MainFeatherdown } from '../src/featherdown.js';
import {
  Featherdown as NodeFeatherdown,
  renderMarkdownToHtmlWithMermaid,
} from '../src/node.js';

describe('featherdown/node Featherdown', () => {
  it('parseFile reads UTF-8 markdown and returns FeatherdownResult', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'featherdown-node-'));
    const path = join(dir, 'sample.md');
    const original = '# Hello\n\nBody **bold**.\n';
    await writeFile(path, original, 'utf8');

    const result = await new NodeFeatherdown().parseFile(path);
    expect(result.body).toBe(original);
    expect(result.html).toContain('Hello');
    expect(result.html).toContain('bold');
    expect(result.frontmatter).toEqual({});
  });

  it('parseFile supports front matter when enabled', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'featherdown-node-fm-'));
    const path = join(dir, 'post.md');
    const fileContent = ['---', 'title: My Post', '---', '', '# Hi', ''].join('\n');
    await writeFile(path, fileContent, 'utf8');

    const result = await new NodeFeatherdown({ frontmatter: 'auto' }).parseFile(path);
    expect(result.frontmatter.title).toBe('My Post');
    expect(result.metadata.title).toBe('My Post');
    expect(result.body.trim()).toBe('# Hi');
    expect(result.body).not.toContain('---');
    expect(result.html).toContain('Hi');
    expect(result.html).not.toContain('My Post');
  });

  it('parse without Mermaid matches main Featherdown HTML and mermaid feature flag', async () => {
    const markdown = ['# Title', '', 'Paragraph with **bold**.', '', '```ts', 'const x = 1;', '```', ''].join('\n');
    const mainResult = await new MainFeatherdown().parse(markdown);
    const nodeResult = await new NodeFeatherdown().parse(markdown);
    expect(nodeResult.html).toBe(mainResult.html);
    expect(nodeResult.assets.features.mermaid).toBe(false);
  });

  it('renderMarkdownToHtmlWithMermaid still returns a string', async () => {
    const html = await renderMarkdownToHtmlWithMermaid('# Hi\n');
    expect(typeof html).toBe('string');
    expect(html).toContain('Hi');
  });

  it('with mermaid.render svg, parse emits inline SVG and sets assets.features.mermaid', async () => {
    const md = ['```mermaid', 'graph TD', '  A-->B', '```', ''].join('\n');
    const result = await new NodeFeatherdown({
      mermaid: { render: 'svg' },
    }).parse(md);
    expect(result.html).toContain('<svg');
    expect(result.assets.features.mermaid).toBe(true);
    expect(result.assets.scripts).toEqual([]);
  }, 30_000);

  it('mermaid-capable parse still renders remark callouts (parity with directives path)', async () => {
    const md = [':::note', 'Callout body.', ':::', ''].join('\n');
    const result = await new NodeFeatherdown({ mermaid: { render: 'svg' } }).parse(md);
    expect(result.html).toContain('callout callout-note');
    expect(result.html).toContain('Callout body.');
  }, 30_000);
});
