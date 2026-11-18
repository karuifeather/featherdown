import { describe, expect, it } from 'vitest';
import { Featherdown, renderMarkdownDocument } from '../src/index.js';

const fd = new Featherdown();
const html = async (md: string, options?: ConstructorParameters<typeof Featherdown>[0]) =>
  (await new Featherdown(options).parse(md)).html;

describe('subSuperscript', () => {
  it('renders H~2~O and x^2^', async () => {
    expect(await html('H~2~O and x^2^')).toContain('<p>H<sub>2</sub>O and x<sup>2</sup></p>');
  });

  it('keeps ~~strikethrough~~ and no longer treats ~x~ as strikethrough', async () => {
    const out = await html('~~gone~~ and ~sub~');
    expect(out).toContain('<del>gone</del>');
    expect(out).toContain('<sub>sub</sub>');
    expect(out).not.toContain('<del>sub</del>');
  });

  it('works inside emphasis, links, headings and tables', async () => {
    const r = await fd.parse('# CO~2~ levels\n\n**H~2~O** [x^2^](https://example.com)\n\n|a|b|\n|-|-|\n|m^2^|~1~|');
    expect(r.html).toContain('CO<sub>2</sub> levels');
    expect(r.html).toContain('<strong>H<sub>2</sub>O</strong>');
    expect(r.html).toContain('<a href="https://example.com">x<sup>2</sup></a>');
    expect(r.html).toContain('<td>m<sup>2</sup></td>');
    expect(r.toc[0]?.text).toBe('CO2 levels');
  });

  it('leaves whitespace-separated marks, code, math, links and footnotes alone', async () => {
    const md = [
      'a ^ b ^ c and ~/src and ~/dist',
      '',
      '`x^2^ y~1~` and $a^2^$',
      '',
      '```\nx^2^\n```',
      '',
      'https://example.com/a~b~c and [link](https://example.com/p^q^r)',
      '',
      'Note[^1]',
      '',
      '[^1]: ref',
    ].join('\n');
    const out = await html(md);
    expect(out).toContain('a ^ b ^ c and ~/src and ~/dist');
    expect(out).toContain('<code>x^2^ y~1~</code>');
    expect(out).toMatch(/<code[^>]*>x\^2\^\n<\/code>/);
    expect(out).not.toContain('<sub>b</sub>');
    expect(out).toContain('href="https://example.com/a~b~c"');
    expect(out).toContain('>https://example.com/a~b~c</a>');
    expect(out).toContain('href="https://example.com/p%5Eq%5Er"');
    expect(out).not.toContain('<sup>q</sup>');
    expect(out).toContain('data-footnote-ref');
    expect(out).not.toContain('<sup>1</sup>');
  });

  it('can be turned off, restoring GFM single-tilde strikethrough', async () => {
    const out = await html('H~2~O x^2^', { subSuperscript: false });
    expect(out).toContain('H<del>2</del>O');
    expect(out).toContain('x^2^');
  });

  it('is not applied by the legacy helpers', async () => {
    const r = await renderMarkdownDocument('H~2~O x^2^');
    expect(r.html).toContain('H<del>2</del>O');
    expect(r.html).not.toContain('<sup>');
  });
});

describe('definitionLists', () => {
  it('renders terms and definitions', async () => {
    const out = await html('Term\n: First\n: Second\n\nOther\n: **Bold** def');
    expect(out).toContain('<dl>');
    expect(out).toContain('<dt>Term</dt>');
    expect(out).toMatch(/<dd>First\s*<\/dd>/);
    expect(out).toMatch(/<dd>Second\s*<\/dd>/);
    expect(out).toContain('<dt>Other</dt>');
    expect(out).toContain('<strong>Bold</strong>');
  });

  it('can be turned off', async () => {
    const out = await html('Term\n: Def', { definitionLists: false });
    expect(out).not.toContain('<dl>');
    expect(out).toContain('Term');
  });

  it('is not applied by the legacy helpers', async () => {
    expect((await renderMarkdownDocument('Term\n: Def')).html).not.toContain('<dl>');
  });

  it('coexists with directives, callouts, details and embeds', async () => {
    const md = [
      ':::note\nHeads up\n:::',
      '',
      ':::details[More]\nBody\n:::',
      '',
      '::youtube{id=dQw4w9WgXcQ}',
      '',
      'Term\n: Definition',
      '',
      '::::tabs\n:::tab[One]\nA\n:::\n::::',
    ].join('\n');
    const out = await html(md, { embeds: true });
    expect(out).toContain('callout callout-note');
    expect(out).toContain('<details class="details">');
    expect(out).toContain('<iframe');
    expect(out).toContain('<dt>Term</dt>');
    expect(out).toContain('tab-panel');
  });

  it('does not touch emoji-like colons mid-line or footnote definitions', async () => {
    const out = await html('Time is 10:30 :smile:\n\nSee[^a]\n\n[^a]: Footnote: with colon');
    expect(out).not.toContain('<dl>');
    expect(out).toContain('10:30 :smile:');
    expect(out).toContain('data-footnote-ref');
  });
});

describe('tabs', () => {
  const md = '::::tabs\n:::tab[npm]\n`npm i x`\n:::\n:::tab[pnpm]\n`pnpm add x`\n:::\n::::';

  it('renders a tablist, tabs and panels with linked ids', async () => {
    const r = await fd.parse(md);
    expect(r.html).toContain('<div class="tabs">');
    expect(r.html).toContain('<div class="tabs-list" role="tablist">');
    expect(r.html).toContain('role="tab"');
    expect(r.html).toContain('id="featherdown-tab-1-1"');
    expect(r.html).toContain('aria-controls="featherdown-panel-1-1"');
    expect(r.html).toContain('aria-selected="true"');
    expect(r.html).toContain('aria-selected="false"');
    expect(r.html).toContain('tabindex="-1"');
    expect(r.html).toContain('id="featherdown-panel-1-2"');
    expect(r.html).toContain('aria-labelledby="featherdown-tab-1-2"');
    expect(r.html).toContain('data-tab-label="pnpm"');
    expect(r.html).toContain('<code>npm i x</code>');
    expect(r.assets.features.tabs).toBe(true);
    expect(r.diagnostics).toEqual([]);
  });

  it('numbers groups per document and renders markdown inside panels', async () => {
    const r = await fd.parse(
      `${md}\n\n::::tabs\n:::tab[A]\n## Heading in tab\n\n- item\n\n:::note\nnested callout\n:::\n:::\n::::`,
    );
    expect(r.html).toContain('id="featherdown-tab-2-1"');
    expect(r.html).toContain('<li>item</li>');
    expect(r.html).toContain('callout callout-note');
    expect(r.toc.map((t) => t.text)).toContain('Heading in tab');
  });

  it('falls back to "Tab N" when a panel has no label', async () => {
    const out = await html('::::tabs\n:::tab\nx\n:::\n::::');
    expect(out).toContain('data-tab-label="Tab 1"');
    expect(out).toContain('>Tab 1</button>');
  });

  it('is on by default for Featherdown but not for legacy helpers', async () => {
    expect((await renderMarkdownDocument(md)).html).not.toContain('role="tablist"');
  });

  it('can be turned off, leaving plain text', async () => {
    const r = await fd.parse(md, { tabs: false });
    expect(r.html).not.toContain('role="tablist"');
    expect(r.assets.features.tabs).toBe(false);
  });

  it('reports an empty tabs block and keeps its text', async () => {
    const r = await fd.parse('::::tabs\nhello\n::::');
    expect(r.diagnostics.map((d) => d.code)).toEqual(['tabs.invalid']);
    expect(r.diagnostics[0]?.source).toBe('tabs');
    expect(r.html).not.toContain('role="tablist"');
    expect(r.html).toContain('hello');
  });

  it('reports stray content and a tab outside tabs', async () => {
    const stray = await fd.parse('::::tabs\nloose\n:::tab[A]\nx\n:::\n::::');
    expect(stray.diagnostics.map((d) => d.code)).toEqual(['tabs.invalid']);
    expect(stray.html).toContain('role="tablist"');
    expect(stray.html).not.toContain('loose');

    const orphan = await fd.parse(':::tab[A]\nx\n:::');
    expect(orphan.diagnostics.map((d) => d.code)).toEqual(['tabs.invalid']);
    expect(orphan.html).not.toContain('role="tablist"');
  });

  it('author ids can never collide with generated ids', async () => {
    const r = await fd.parse(`${md}\n\n## Top {#featherdown-tab-1-1}`);
    const ids = [...r.html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(r.html).toContain('id="featherdown-tab-1-1"');
    expect(r.html).toContain('user-content-featherdown-tab-1-1');
  });

  it('does not let raw HTML inject buttons or arbitrary tab attributes', async () => {
    const out = await html('<button role="tab" onclick="x()">hi</button><div class="tab-panel" onclick="x()">p</div>');
    expect(out).not.toContain('<button');
    expect(out).not.toContain('onclick');
  });

  it('a raw div.tabs gets a tablist too (same trusted output as the directive)', async () => {
    const out = await html('<div class="tabs"><div class="tab-panel" data-tab-label="Raw">p</div></div>');
    expect(out).toContain('role="tablist"');
    expect(out).toContain('>Raw</button>');
  });

  it('diagnostics: "strict" throws on malformed tabs', async () => {
    await expect(new Featherdown({ diagnostics: 'strict' }).parse('::::tabs\nhello\n::::')).rejects.toThrow();
  });
});

describe('inline colons are not directives', () => {
  it.each([
    'Meet at 10:30 today',
    'Reaction :smile: done',
    'See foo:bar and ratio 3:1',
    'Use :name[label]{#x} literally',
  ])('keeps %s as written', async (text) => {
    for (const out of [(await fd.parse(text)).html, (await renderMarkdownDocument(text)).html]) {
      expect(out).toBe(`<p>${text.replace(/\{#x\}/, '{#x}')}</p>`);
    }
  });
});

describe('cache isolation between gate combinations', () => {
  it('different gates never share a processor', async () => {
    const md = 'H~2~O\n\nTerm\n: Def\n\n::::tabs\n:::tab[A]\nx\n:::\n::::';
    const on = await new Featherdown().parse(md);
    const off = await new Featherdown({ subSuperscript: false, definitionLists: false, tabs: false }).parse(md);
    const on2 = await new Featherdown().parse(md);
    expect(on.html).toBe(on2.html);
    expect(on.html).toContain('<sub>');
    expect(off.html).not.toContain('<sub>');
    expect(off.html).not.toContain('<dl>');
    expect(off.html).not.toContain('tablist');
  });
});
