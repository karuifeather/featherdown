import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readmePath = join(__dirname, '../../README.md');

describe('README documentation contract', () => {
  function quickStartBody(readme: string): string {
    const quickStartMatch = readme.match(/## Quick start\r?\n\r?\n([\s\S]*?)(?=\r?\n## [A-Za-z])/);
    expect(quickStartMatch, 'README must contain a Quick start section').toBeTruthy();
    const body = quickStartMatch?.[1];
    if (body === undefined) {
      throw new Error('Quick start regex failed');
    }
    return body;
  }

  it('quick start section teaches Featherdown first, not legacy HTML helper', async () => {
    const readme = await readFile(readmePath, 'utf8');
    const body = quickStartBody(readme);
    expect(body).toContain('import { Featherdown } from "featherdown"');
    expect(body).toContain('import "featherdown/styles.css"');
    expect(body).toContain('new Featherdown()');
    expect(body).toMatch(/\.parse\(/);
    expect(body).toContain('new Featherdown');
    expect(body).toContain('featherdown/styles.css');
    expect(body).not.toContain('renderMarkdownToHtml');
  });

  it('documents key subpaths and front matter mode', async () => {
    const readme = await readFile(readmePath, 'utf8');
    expect(readme).toContain('featherdown/styles.css');
    expect(readme).toContain('featherdown/node');
    expect(readme).toContain('featherdown/advanced');
    expect(readme).toContain('frontmatter: "auto"');
  });

  it('migration section states legacy helpers vs FeatherdownOptions honestly', async () => {
    const readme = await readFile(readmePath, 'utf8');
    expect(readme.toLowerCase()).toContain('legacy helpers are kept for compatibility');
    expect(readme).toContain('not a full alias for **`FeatherdownOptions`**');
  });

  it('does not introduce renderMarkdownToHtml before Quick start', async () => {
    const readme = await readFile(readmePath, 'utf8');
    const idx = readme.indexOf('## Quick start');
    expect(idx).toBeGreaterThan(-1);
    expect(readme.slice(0, idx)).not.toContain('renderMarkdownToHtml');
  });

  it('documents diagnostics strict mode and FeatherdownDiagnosticsError', async () => {
    const readme = await readFile(readmePath, 'utf8');
    expect(readme).toContain('diagnostics: "strict"');
    expect(readme).toContain('FeatherdownDiagnosticsError');
  });

  it('Options section documents headings and toc metadata', async () => {
    const readme = await readFile(readmePath, 'utf8');
    const optionsIdx = readme.indexOf('## Options');
    const frontMatterIdx = readme.indexOf('## Front matter');
    expect(optionsIdx).toBeGreaterThan(-1);
    expect(frontMatterIdx).toBeGreaterThan(optionsIdx);
    const optionsSection = readme.slice(optionsIdx, frontMatterIdx);
    expect(optionsSection.toLowerCase()).toContain('headings');
    expect(optionsSection.toLowerCase()).toContain('toc');
  });

  it('legacy migration copy frames helpers as compatibility, Featherdown for new code', async () => {
    const readme = await readFile(readmePath, 'utf8');
    const lower = readme.toLowerCase();
    expect(lower).toContain('kept for compatibility');
    expect(lower).toContain('new code should use');
  });
});
