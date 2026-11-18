import { describe, expect, it } from 'vitest';
import { Featherdown } from '../src/index.js';
import { renderMarkdownToHtml as renderMarkdown } from '../src/legacy.js';

const html = async (md: string, opts: ConstructorParameters<typeof Featherdown>[0]) =>
  (await new Featherdown(opts).parse(md)).html;

describe('external links', () => {
  const md = [
    '[ext](https://other.com/x)',
    '[proto](//cdn.other.com/y)',
    '[rel](/about)',
    '[rel2](page.html)',
    '[mail](mailto:a@b.com)',
    '[anchor](#top)',
    '[mine](https://mysite.com/a)',
  ].join('\n\n');

  it('decorates only external links', async () => {
    const out = await html(md, { links: { internalHosts: ['mysite.com'] } });
    expect(out).toContain('<a href="https://other.com/x" rel="noopener noreferrer" target="_blank">');
    expect(out).toContain('<a href="//cdn.other.com/y" rel="noopener noreferrer" target="_blank">');
    expect(out).toContain('<a href="/about">');
    expect(out).toContain('<a href="page.html">');
    expect(out).toContain('<a href="mailto:a@b.com">');
    expect(out).toContain('<a href="#top">');
    expect(out).toContain('<a href="https://mysite.com/a">');
  });

  it('matches internalHosts by exact and wildcard (subdomains only)', async () => {
    const out = await html(
      '[a](https://example.com/)\n\n[b](https://blog.example.com/)\n\n[c](https://x.y.example.com/)\n\n[d](https://notexample.com/)',
      { links: { internalHosts: ['*.example.com'] } },
    );
    expect(out).toMatch(/<a href="https:\/\/example\.com\/" rel/);
    expect(out).toContain('<a href="https://blog.example.com/">');
    expect(out).toContain('<a href="https://x.y.example.com/">');
    expect(out).toMatch(/<a href="https:\/\/notexample\.com\/" rel/);
    const exact = await html('[a](https://EXAMPLE.com/)', { links: { internalHosts: ['example.com'] } });
    expect(exact).toContain('<a href="https://EXAMPLE.com/">');
  });

  it('merges rel tokens without duplicates', async () => {
    const out = await html('<a href="https://other.com" rel="nofollow noopener">x</a>', {
      links: true,
      sanitize: false,
    });
    expect(out).toContain('rel="nofollow noopener noreferrer"');
  });

  it('honours rel:false and target:false', async () => {
    const a = await html('[x](https://other.com)', { links: { rel: false } });
    expect(a).toContain('<a href="https://other.com" target="_blank">');
    const b = await html('[x](https://other.com)', { links: { target: false } });
    expect(b).toContain('<a href="https://other.com" rel="noopener noreferrer">');
    const c = await html('[x](https://other.com)', { links: { rel: 'nofollow', target: '_top' } });
    expect(c).toContain('rel="nofollow" target="_top"');
  });

  it('leaves links untouched when the gate is off', async () => {
    const out = await html('[x](https://other.com)', {});
    expect(out).toContain('<a href="https://other.com">');
  });
});

describe('image attributes', () => {
  it('adds lazy/async by default and leaves images alone when off', async () => {
    const on = await html('![a](x.png)', { images: true });
    expect(on).toContain('loading="lazy"');
    expect(on).toContain('decoding="async"');
    const off = await html('![a](x.png)', {});
    expect(off).not.toContain('loading=');
    expect(off).not.toContain('decoding=');
  });

  it('respects overrides and does not override existing attributes', async () => {
    const out = await html('![a](x.png)', { images: { lazy: false, decoding: 'sync' } });
    expect(out).not.toContain('loading=');
    expect(out).toContain('decoding="sync"');
    const none = await html('![a](x.png)', { images: { decoding: false } });
    expect(none).not.toContain('decoding=');
    const existing = await html('<img src="x.png" alt="" loading="eager">', {
      images: true,
      sanitize: false,
    });
    expect(existing).toContain('loading="eager"');
  });
});

describe('figures', () => {
  const opts = { images: { figure: true } };

  it('wraps a titled image in a figure and drops the title attribute', async () => {
    const out = await html('![alt](x.png "My caption")', opts);
    expect(out).toContain('<figure class="markdown-figure">');
    expect(out).toContain('<figcaption>My caption</figcaption>');
    expect(out).not.toContain('title=');
    expect(out).not.toContain('<p>');
  });

  it('is off by default', async () => {
    const out = await html('![alt](x.png "My caption")', { images: true });
    expect(out).not.toContain('<figure');
    expect(out).toContain('title="My caption"');
  });

  it('wraps linked images around the anchor', async () => {
    const out = await html('[![alt](x.png "Cap")](https://other.com)', { ...opts, links: true });
    expect(out).toMatch(
      /<figure class="markdown-figure"><a [^>]*href="https:\/\/other.com"[^>]*><img [^>]*><\/a>\s*<figcaption>Cap<\/figcaption>/,
    );
  });

  it('does not wrap images without a title or mixed with text', async () => {
    expect(await html('![alt](x.png)', opts)).not.toContain('<figure');
    expect(await html('hello ![alt](x.png "T")', opts)).not.toContain('<figure');
    expect(await html('![a](x.png "T") ![b](y.png "U")', opts)).not.toContain('<figure');
  });

  it('escapes caption text', async () => {
    const out = await html('![a](x.png "<b>&")', opts);
    expect(out).not.toContain('<b>');
    expect(out).toContain('<figcaption>');
  });
});

describe('manifest width/height', () => {
  const manifest = {
    map: { 'post/s/a.png': { url: 'https://cdn/a.png', width: 800, height: 600 } },
    remote: {
      'https://r.com/b.png': { url: 'https://cdn/b.png', width: 10, height: -1 },
    },
  };

  it('sets dimensions for map and remote entries (only positive numbers)', async () => {
    const out = await html('![a](a.png)\n\n![b](https://r.com/b.png)', {
      kind: 'post',
      slug: 's',
      manifest,
    });
    expect(out).toContain('width="800"');
    expect(out).toContain('height="600"');
    expect(out).toContain('width="10"');
    expect(out).not.toContain('height="-1"');
  });

  it('applies to legacy helpers and leaves old manifests unaffected', async () => {
    const out = await renderMarkdown('![a](a.png)', { kind: 'post', slug: 's', manifest });
    expect(out).toContain('width="800"');
    const old = await renderMarkdown('![a](a.png)', {
      kind: 'post',
      slug: 's',
      manifest: { map: { 'post/s/a.png': { url: 'https://cdn/a.png' } } },
    });
    expect(old).not.toContain('width=');
  });
});

describe('legacy output', () => {
  it('does not decorate links or images', async () => {
    const out = await renderMarkdown('[x](https://other.com) ![a](x.png "T")');
    expect(out).toContain('<a href="https://other.com">');
    expect(out).not.toContain('loading=');
    expect(out).not.toContain('<figure');
  });
});

describe('cached processor isolation', () => {
  it('does not leak links/images options between concurrent parses', async () => {
    const md = '[x](https://other.com)\n\n![a](x.png "T")';
    const a = new Featherdown({ links: { target: false }, images: { figure: true } });
    const b = new Featherdown({ links: { rel: false }, images: { lazy: false } });
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? a : b).parse(md)),
    );
    results.forEach((r, i) => {
      if (i % 2 === 0) {
        expect(r.html).toContain('rel="noopener noreferrer"');
        expect(r.html).not.toContain('target=');
        expect(r.html).toContain('<figure');
      } else {
        expect(r.html).toContain('target="_blank"');
        expect(r.html).not.toContain('rel=');
        expect(r.html).not.toContain('<figure');
        expect(r.html).not.toContain('loading=');
      }
    });
  });
});
