import { describe, expect, it } from 'vitest';
import { parseMarkdownFile } from '../src/parseMarkdownFile.js';

describe('parseMarkdownFile', () => {
  it('returns empty front matter and full body when no YAML block', () => {
    const raw = '# Title\n\nBody';
    expect(parseMarkdownFile(raw)).toEqual({
      frontMatter: {},
      content: raw,
    });
  });

  it('returns empty front matter when opening --- is not followed by a closing fence', () => {
    const raw = '---\nnot closed';
    expect(parseMarkdownFile(raw)).toEqual({
      frontMatter: {},
      content: raw,
    });
  });

  it('parses YAML mapping and strips fences from content', () => {
    const raw = '---\ntitle: Hello\ndraft: true\n---\n\n# Doc\n';
    const { frontMatter, content } = parseMarkdownFile(raw);
    expect(frontMatter).toEqual({ title: 'Hello', draft: true });
    expect(content).toBe('\n# Doc\n');
  });

  it('treats empty YAML as empty front matter', () => {
    const raw = '---\n\n---\n\nText';
    expect(parseMarkdownFile(raw)).toEqual({
      frontMatter: {},
      content: '\nText',
    });
  });

  it('throws a clear error when YAML is invalid', () => {
    const raw = '---\nfoo: [bar\n---\n';
    expect(() => parseMarkdownFile(raw)).toThrow(/Front matter YAML could not be parsed/);
  });

  it('throws when the root YAML value is not a mapping', () => {
    const raw = '---\n- a\n- b\n---\n';
    expect(() => parseMarkdownFile(raw)).toThrow(/mapping/);
  });
});
