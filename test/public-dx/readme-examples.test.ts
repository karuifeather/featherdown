import { describe, expect, it } from 'vitest';
import { Featherdown } from '../../src/featherdown.js';
import { Featherdown as NodeFeatherdown } from '../../src/node.js';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Mirrors README quick start and key examples so onboarding docs cannot drift silently.
 */
describe('README-aligned examples', () => {
  it('quick start: Featherdown parses heading HTML', async () => {
    const featherdown = new Featherdown();
    const result = await featherdown.parse('# Hello');
    expect(result.html).toContain('<h1');
    expect(result.html.toLowerCase()).toContain('hello');
  });

  it('CSS asset hints: default parse reports base.css', async () => {
    const featherdown = new Featherdown();
    const result = await featherdown.parse('# Hello');
    expect(result.assets.styles).toContain('featherdown/styles/base.css');
  });

  it('front matter auto: strips YAML and populates metadata', async () => {
    const featherdown = new Featherdown({
      frontmatter: 'auto',
    });

    const result = await featherdown.parse(`---
title: Hello World
tags:
  - docs
---

# Hello`);

    expect(result.frontmatter.title).toBe('Hello World');
    expect(result.metadata.title).toBe('Hello World');
    expect(result.body).not.toContain('title: Hello World');
    expect(result.html).toContain('Hello');
  });

  it('Node: parseFile with frontmatter matches README workflow', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'featherdown-readme-node-'));
    const path = join(dir, 'post.md');
    const fileContent = ['---', 'title: From File', '---', '', '# Hi', ''].join('\n');
    await writeFile(path, fileContent, 'utf8');

    const result = await new NodeFeatherdown({
      frontmatter: 'auto',
    }).parseFile(path);

    expect(result.html).toContain('<h1');
    expect(result.frontmatter.title).toBe('From File');
    expect(result.metadata.title).toBe('From File');
  });

  it('Node Mermaid: svg option is accepted without duplicating heavy SVG integration tests', () => {
    const fd = new NodeFeatherdown({
      mermaid: { render: 'svg' },
    });
    expect(typeof fd.parse).toBe('function');
    expect(typeof fd.parseFile).toBe('function');
  });
});
