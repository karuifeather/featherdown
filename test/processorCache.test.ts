import { describe, expect, it } from 'vitest';
import { Featherdown } from '../src/index.js';

describe('cached processors keep per-parse state isolated', () => {
  it('does not leak manifests or diagnostics between concurrent parses', async () => {
    const md = '![logo](images/logo.png)\n\n```chart-bar\n{bad\n```\n';
    const a = new Featherdown({
      kind: 'post',
      slug: 'a',
      manifest: { map: { 'post/a/images/logo.png': { url: 'https://cdn.example.com/a.png' } } },
      diagnostics: 'warn',
    });
    const b = new Featherdown({
      kind: 'post',
      slug: 'b',
      manifest: { map: {} },
      diagnostics: 'warn',
    });

    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? a : b).parse(md)),
    );

    results.forEach((result, i) => {
      const codes = result.diagnostics.map((d) => d.code).sort();
      if (i % 2 === 0) {
        expect(result.html).toContain('src="https://cdn.example.com/a.png"');
        expect(codes).toEqual(['chart.invalid_json']);
      } else {
        expect(result.html).toContain('src="images/logo.png"');
        expect(codes).toEqual(['chart.invalid_json', 'images.manifest_miss']);
      }
    });
  });

  it('produces identical output on repeated parses with the same gates', async () => {
    const fd = new Featherdown({ math: true });
    const md = '# Title\n\nText $x$.\n';
    const first = await fd.parse(md);
    const second = await fd.parse(md);
    expect(second.html).toBe(first.html);
    expect(second.diagnostics).toEqual(first.diagnostics);
  });

  it('respects different feature gates per call', async () => {
    const fd = new Featherdown({ math: true });
    const md = 'Text $x$.\n';
    const on = await fd.parse(md);
    const off = await fd.parse(md, { math: false });
    expect(on.html).toContain('katex');
    expect(off.html).not.toContain('katex');
  });
});
