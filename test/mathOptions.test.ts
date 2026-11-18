import { describe, expect, it } from 'vitest';
import { Featherdown, FeatherdownDiagnosticsError } from '../src/index.js';
import { renderMarkdownDocument } from '../src/legacy.js';

describe('math.macros', () => {
  it('expands configured macros', async () => {
    const f = new Featherdown({ math: { macros: { '\\R': '\\mathbb{R}' } } });
    const r = await f.parse('$x \\in \\R$');
    expect(r.html).not.toContain('katex-error');
    expect(r.html).toContain('mathbb');
    expect(r.diagnostics).toEqual([]);
  });

  it('reports an undefined macro as a math.render diagnostic', async () => {
    const r = await new Featherdown().parse('$x \\in \\RR$');
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0]).toMatchObject({ code: 'math.render', source: 'math', severity: 'warning' });
    expect(r.diagnostics[0]?.message).toContain('\\RR');
  });

  it('merges constructor and per-parse macros, per-parse winning', async () => {
    const f = new Featherdown({ math: { macros: { '\\A': 'a', '\\B': 'b' } } });
    const r = await f.parse('$\\A \\B \\C$', { math: { macros: { '\\B': 'bee', '\\C': 'c' } } });
    expect(r.html).not.toContain('katex-error');
    expect(r.diagnostics).toEqual([]);
  });

  it('keeps macros when the per-parse math option is `true`', async () => {
    const f = new Featherdown({ math: { macros: { '\\R': '\\mathbb{R}' } } });
    const r = await f.parse('$\\R$', { math: true });
    expect(r.html).not.toContain('katex-error');
  });

  it('does not leak \\gdef definitions between parses', async () => {
    const f = new Featherdown({ math: { macros: { '\\R': '\\mathbb{R}' } } });
    const first = await f.parse('$\\gdef\\leak{42} \\leak$');
    expect(first.html).not.toContain('katex-error');
    const second = await f.parse('$\\leak$');
    expect(second.diagnostics[0]?.code).toBe('math.render');
    expect(second.diagnostics[0]?.message).toContain('\\leak');
  });

  it('does not mutate the macros object the caller passed in', async () => {
    const macros = { '\\R': '\\mathbb{R}' };
    await new Featherdown({ math: { macros } }).parse('$\\gdef\\z{1}\\z \\R$');
    expect(macros).toEqual({ '\\R': '\\mathbb{R}' });
  });

  it('survives concurrent parses with different macros', async () => {
    const f = new Featherdown();
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        f.parse('$\\M$', { math: { macros: { '\\M': `{m${String(i)}}` } } }),
      ),
    );
    results.forEach((r, i) => {
      expect(r.html).toContain('m</span>');
      expect(r.html).toContain(`>${String(i)}<`);
      expect(r.diagnostics).toEqual([]);
    });
  });
});

describe('math.trust', () => {
  it('blocks \\href by default and reports it', async () => {
    const r = await new Featherdown().parse('$\\href{javascript:alert(1)}{x}$');
    expect(r.html).not.toContain('javascript:');
    expect(r.html).not.toContain('<a');
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0]).toMatchObject({ code: 'math.trust', source: 'math' });
    expect(r.diagnostics[0]?.message).toContain('\\href');
  });

  it('blocks \\htmlStyle and \\htmlId by default', async () => {
    const r = await new Featherdown().parse('$\\htmlStyle{position:fixed}{x}$ $\\htmlId{evil}{y}$');
    expect(r.html).not.toContain('position:fixed');
    expect(r.html).not.toContain('id="evil"');
    expect(r.diagnostics.map((d) => d.code)).toEqual(['math.trust', 'math.trust']);
  });

  it('reports a blocked command once even when the equation also fails to parse', async () => {
    // The parse error comes after \href, so KaTeX asks about trust, fails, then asks again in
    // rehype-katex's fallback render.
    const r = await new Featherdown().parse('$\\href{https://example.com}{x} \\frac{1$');
    expect(r.diagnostics.map((d) => d.code)).toEqual(['math.trust', 'math.render']);
  });

  it('still reports blocked commands separately for separate equations', async () => {
    const r = await new Featherdown().parse(
      '$\\href{https://a.example}{x} \\frac{1$\n\n$\\href{https://a.example}{x} \\frac{1$\n\n$\\href{https://a.example}{x}$',
    );
    // One math.trust per equation (3), one math.render per broken equation (2). Render errors
    // are collected after the pass, so they follow the trust diagnostics.
    const codes = r.diagnostics.map((d) => d.code);
    expect(codes.filter((c) => c === 'math.trust')).toHaveLength(3);
    expect(codes.filter((c) => c === 'math.render')).toHaveLength(2);
    expect(codes).toHaveLength(5);
  });

  it('allows HTML-extension commands when trust is true', async () => {
    const r = await new Featherdown({ math: { trust: true } }).parse('$\\htmlClass{hl}{x}$');
    expect(r.html).toContain('enclosing hl');
    expect(r.diagnostics).toEqual([]);
  });

  it('trust stays off for legacy helpers', async () => {
    const r = await renderMarkdownDocument('$\\href{https://example.com}{x}$');
    expect(r.html).not.toContain('<a href="https://example.com"');
  });
});

describe('math.strict', () => {
  // Unicode text in math mode is the classic non-strict input.
  const nonStrict = '$é$';

  it('ignores strictness violations by default (no console noise, no diagnostic)', async () => {
    const r = await new Featherdown().parse(nonStrict);
    expect(r.html).not.toContain('katex-error');
    expect(r.diagnostics).toEqual([]);
  });

  it('"warn" reports math.strict diagnostics and still renders', async () => {
    const r = await new Featherdown({ math: { strict: 'warn' } }).parse('$a é$');
    expect(r.html).toContain('katex');
    expect(r.html).not.toContain('katex-error');
    expect(r.diagnostics.length).toBeGreaterThan(0);
    expect(r.diagnostics.every((d) => d.code === 'math.strict' && d.source === 'math')).toBe(true);
  });

  it('"error" and `true` report math.render (the equation itself still renders)', async () => {
    for (const strict of ['error', true] as const) {
      const r = await new Featherdown({ math: { strict } }).parse('$é$');
      expect(r.diagnostics).toHaveLength(1);
      expect(r.diagnostics[0]?.code).toBe('math.render');
      expect(r.html).toContain('class="katex"');
    }
  });

  it('"error" makes diagnostics: "strict" throw', async () => {
    const f = new Featherdown({ math: { strict: 'error' }, diagnostics: 'strict' });
    await expect(f.parse('$é$')).rejects.toBeInstanceOf(FeatherdownDiagnosticsError);
  });

  it('`false` behaves like "ignore"', async () => {
    const r = await new Featherdown({ math: { strict: false } }).parse('$é$');
    expect(r.diagnostics).toEqual([]);
  });
});

describe('math diagnostics', () => {
  it('reports each broken equation and keeps valid ones', async () => {
    const r = await new Featherdown().parse('$a^2$\n\n$\\frac{1$\n\n$$\n\\badcmd\n$$');
    expect(r.diagnostics.map((d) => d.code)).toEqual(['math.render', 'math.render']);
    expect(r.html).toContain('katex-error');
    expect(r.html).toContain('class="katex"');
  });

  it('diagnostics: "strict" throws on broken math', async () => {
    const f = new Featherdown({ diagnostics: 'strict' });
    await expect(f.parse('$\\frac{1$')).rejects.toBeInstanceOf(FeatherdownDiagnosticsError);
    await expect(f.parse('$a^2$')).resolves.toBeDefined();
  });

  it('diagnostics: false hides them', async () => {
    const r = await new Featherdown({ diagnostics: false }).parse('$\\frac{1$');
    expect(r.diagnostics).toEqual([]);
  });

  it('legacy helpers keep their diagnostics unchanged', async () => {
    const r = await renderMarkdownDocument('$\\frac{1$');
    expect(r.diagnostics).toEqual([]);
  });

  it('math: false renders no KaTeX and no math diagnostics', async () => {
    const r = await new Featherdown({ math: false }).parse('$\\frac{1$');
    expect(r.diagnostics).toEqual([]);
  });

  it('tuning a disabled math group does not re-enable it', async () => {
    const r = await new Featherdown({ math: false }).parse('$x$', { math: { macros: { '\\a': 'b' } } });
    expect(r.html).not.toContain('katex');
  });
});
