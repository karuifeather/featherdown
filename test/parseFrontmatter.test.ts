import { describe, expect, it } from 'vitest';
import {
  extractFrontMatterLenient,
  extractFrontMatterStrict,
  parseFrontmatter,
} from '../src/internal/parseFrontmatter.js';

describe('parseFrontmatter', () => {
  it('returns full body when mode is false', () => {
    const raw = '---\ntitle: x\n---\n# Hi';
    expect(parseFrontmatter(raw, false)).toEqual({
      body: raw,
      frontmatter: {},
      hasFrontmatter: false,
    });
  });

  it('parses valid front matter in true mode', () => {
    const raw = '---\na: 1\n---\n\nBody\n';
    const r = parseFrontmatter(raw, true);
    expect(r.hasFrontmatter).toBe(true);
    expect(r.frontmatter).toEqual({ a: 1 });
    expect(r.body).toBe('\nBody\n');
  });

  it('returns empty state when no front matter block', () => {
    const raw = '# Title\n';
    expect(parseFrontmatter(raw, 'auto')).toEqual({
      body: raw,
      frontmatter: {},
      hasFrontmatter: false,
    });
  });

  it('treats empty YAML as empty object with stripped fence', () => {
    const raw = '---\n\n---\n\nText';
    const r = parseFrontmatter(raw, 'auto');
    expect(r.hasFrontmatter).toBe(true);
    expect(r.frontmatter).toEqual({});
    expect(r.body).toBe('\nText');
  });
});

describe('extractFrontMatterStrict', () => {
  it('throws on invalid YAML', () => {
    const raw = '---\nfoo: [bar\n---\n';
    expect(() => extractFrontMatterStrict(raw)).toThrow(/Front matter YAML could not be parsed/);
  });

  it('throws when root is not a mapping', () => {
    const raw = '---\n- a\n- b\n---\n';
    expect(() => extractFrontMatterStrict(raw)).toThrow(/mapping/);
  });
});

describe('extractFrontMatterLenient', () => {
  it('returns original string on invalid YAML', () => {
    const raw = '---\nfoo: [bar\n---\n';
    const r = extractFrontMatterLenient(raw);
    expect(r.body).toBe(raw);
    expect(r.frontmatter).toEqual({});
    expect(r.hasFrontmatter).toBe(false);
  });
});
