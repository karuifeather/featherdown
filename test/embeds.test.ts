import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkDirective from 'remark-directive';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import { Featherdown } from '../src/index.js';
import { renderMarkdown, renderMarkdownDocument, renderMarkdownToHtml } from '../src/legacy.js';
import rehypeEmbeds from '../src/internal/rehypeEmbeds.js';
import remarkEmbeds from '../src/internal/remarkEmbeds.js';
import { Featherdown as NodeFeatherdown } from '../src/node.js';
import type { FeatherdownOptions } from '../src/types.js';

const YT = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
const iframe = (src: string, extra = ''): string => `<iframe src="${src}"${extra}></iframe>\n`;

async function parse(md: string, options: FeatherdownOptions = { embeds: true }) {
  return new Featherdown(options).parse(md);
}

async function allowed(src: string, options: FeatherdownOptions = { embeds: true }): Promise<boolean> {
  const { html } = await parse(iframe(src), options);
  return html.includes('<iframe');
}

function iframeCount(html: string): number {
  return html.split('<iframe').length - 1;
}

describe('embeds gate off', () => {
  const md = [iframe(YT), '::youtube{id="dQw4w9WgXcQ"}', '', '::embed{src="https://www.youtube.com/embed/dQw4w9WgXcQ"}', ''].join(
    '\n',
  );

  it('strips raw and directive iframes by default', async () => {
    const { html } = await new Featherdown().parse(md);
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('youtube');
  });

  it('strips iframes with embeds: false', async () => {
    const { html } = await parse(md, { embeds: false });
    expect(html).not.toContain('<iframe');
  });

  it('legacy helpers keep stripping iframes', async () => {
    for (const html of [
      await renderMarkdownToHtml(md),
      (await renderMarkdown(md)).html,
      (await renderMarkdownDocument(md)).html,
    ]) {
      expect(html).not.toContain('<iframe');
      expect(html).not.toContain('class="embed');
    }
  });

  it('unknown leaf directives never become raw elements or keep attributes', async () => {
    for (const options of [{}, { embeds: true }] as FeatherdownOptions[]) {
      const { html } = await parse('::foo{onclick="x" src="javascript:alert(1)"}\n\n::bar[label]{style="x"}\n', options);
      expect(html).toBe('<div></div>\n<div>label</div>');
    }
  });
});

describe('raw iframe allowlist', () => {
  it('allows and hardens a youtube embed', async () => {
    const { html, diagnostics } = await parse(iframe(YT, ' title="Rick" width="560" height="315"'));
    expect(diagnostics).toEqual([]);
    expect(html).toBe(
      '<div class="embed embed-youtube"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Rick" width="560" height="315" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation" allow="fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe></div>',
    );
  });

  it('derives a default title and drops iframe children', async () => {
    const { html } = await parse('<iframe src="https://player.vimeo.com/video/76979871"><script>x()</script>fallback</iframe>\n');
    expect(html).toContain('title="Embedded content"');
    expect(html).toContain('class="embed embed-vimeo"');
    expect(html).not.toContain('fallback');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('x()');
  });

  it('strips srcdoc, event handlers, style, name, id, sandbox and allow from authors', async () => {
    const { html } = await parse(
      iframe(
        YT,
        ' srcdoc="<script>alert(1)</script>" onload="alert(1)" onerror="alert(1)" style="position:fixed" name="target" id="x" sandbox="allow-top-navigation" allow="camera; microphone" tabindex="1" class="evil" referrerpolicy="unsafe-url" loading="eager" width="100px" height="1e9"',
      ),
    );
    expect(iframeCount(html)).toBe(1);
    for (const bad of ['srcdoc', 'onload', 'onerror', 'alert', 'style=', 'name=', 'id=', 'top-navigation', 'camera', 'tabindex', 'evil', 'unsafe-url', 'eager', 'width=', 'height=']) {
      expect(html).not.toContain(bad);
    }
  });

  it('removes iframes without src (srcdoc only)', async () => {
    const { html, diagnostics } = await parse('<iframe srcdoc="<script>alert(1)</script>"></iframe>\n');
    expect(html).not.toContain('<iframe');
    expect(diagnostics.map((d) => [d.code, d.source])).toEqual([['embeds.blocked', 'embeds']]);
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://www.youtube.com/embed/dQw4w9WgXcQ',
    '//www.youtube.com/embed/dQw4w9WgXcQ',
    '/embed/dQw4w9WgXcQ',
    'embed/dQw4w9WgXcQ',
    'blob:https://www.youtube.com/abc',
    'about:blank',
  ])('blocks non-https or relative src %s', async (src) => {
    const { html, diagnostics } = await parse(iframe(src));
    expect(html).not.toContain('<iframe');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ code: 'embeds.blocked', source: 'embeds', severity: 'warning' });
  });

  it.each([
    'https://youtube.com.evil.com/embed/dQw4w9WgXcQ',
    'https://evilyoutube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com.evil.com/embed/dQw4w9WgXcQ',
    'https://youtube.com@evil.com/embed/dQw4w9WgXcQ',
    'https://user:pass@www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com@www.youtube.com/embed/dQw4w9WgXcQ',
    'https://evil.com\\@www.youtube.com/embed/dQw4w9WgXcQ',
    'https://evil.com#@www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com./embed/dQw4w9WgXcQ',
    'https://www.youtube.com:8443/embed/dQw4w9WgXcQ',
    'https://www.yоutube.com/embed/dQw4w9WgXcQ', // Cyrillic "о" -> punycode host
    'https://xn--yutube-ta.com/embed/dQw4w9WgXcQ',
    'https://m.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ/../../redirect',
    'https://www.youtube.com/embed/short',
    'https://www.youtube.com/embed/dQw4w9WgXcQ/extra',
    'https://player.vimeo.com/video/abc',
    'https://vimeo.com/video/123',
    'https://codepen.io/user/pen/abc',
    'https://codesandbox.io/s/abc',
    'https://stackblitz.com/edit/abc',
    'https://stackblitz.com/edit/abc?embed=0',
  ])('blocks lookalike or non-embed URL %s', async (src) => {
    expect(await allowed(src)).toBe(false);
  });

  it.each([
    ['https://www.youtube.com/embed/dQw4w9WgXcQ?start=30', 'youtube'],
    ['https://youtube.com/embed/dQw4w9WgXcQ', 'youtube'],
    ['https://WWW.YOUTUBE.COM/embed/dQw4w9WgXcQ', 'youtube'],
    ['https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', 'youtube'],
    ['https://www.youtube.com:443/embed/dQw4w9WgXcQ', 'youtube'],
    ['https://player.vimeo.com/video/76979871', 'vimeo'],
    ['https://codepen.io/some-user/embed/AbCdEf?default-tab=result', 'codepen'],
    ['https://codepen.io/some-user/embed/preview/AbCdEf', 'codepen'],
    ['https://codesandbox.io/embed/new-sandbox-xyz', 'codesandbox'],
    ['https://stackblitz.com/edit/vitejs-vite-abc?embed=1&file=index.html', 'stackblitz'],
  ])('allows provider URL %s', async (src, provider) => {
    const { html, diagnostics } = await parse(iframe(src));
    expect(diagnostics).toEqual([]);
    expect(html).toContain(`class="embed embed-${provider}"`);
  });

  it('serializes the normalized URL that was validated', async () => {
    const { html } = await parse(iframe('https://WWW.YOUTUBE.COM:443/embed/dQw4w9WgXcQ'));
    expect(html).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"');
  });

  it('gives code playgrounds forms/modals but never top navigation', async () => {
    const { html } = await parse(iframe('https://codesandbox.io/embed/abc'));
    expect(html).toContain(
      'sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation allow-forms allow-modals"',
    );
    expect(html).toContain('allow="fullscreen; clipboard-write"');
    expect(html).not.toContain('top-navigation');
  });

  it('restricts to the configured provider subset', async () => {
    const options: FeatherdownOptions = { embeds: { providers: ['vimeo'] } };
    expect(await allowed(YT, options)).toBe(false);
    expect(await allowed('https://player.vimeo.com/video/1', options)).toBe(true);
    expect(await allowed('https://player.vimeo.com/video/1', { embeds: { providers: [] } })).toBe(false);
  });

  it('hoists an iframe out of its own paragraph', async () => {
    const { html } = await parse(`<p>${iframe(YT).trim()}</p>\n`);
    expect(html).toMatch(/^<div class="embed embed-youtube"><iframe /);
    expect(html).not.toContain('<p>');
  });

  it('removes nested blocked iframes inside other markup', async () => {
    const { html, diagnostics } = await parse(`<div><blockquote>${iframe('https://evil.com/x').trim()}</blockquote></div>\n`);
    expect(html).not.toContain('<iframe');
    expect(diagnostics).toHaveLength(1);
  });
});

describe('allowHosts', () => {
  const exact: FeatherdownOptions = { embeds: { providers: [], allowHosts: ['embed.example.com'] } };
  const wild: FeatherdownOptions = { embeds: { providers: [], allowHosts: ['*.example.com'] } };

  it('exact entries match only that host', async () => {
    expect(await allowed('https://embed.example.com/any/path?q=1', exact)).toBe(true);
    expect(await allowed('https://EMBED.example.com/x', exact)).toBe(true);
    expect(await allowed('https://example.com/x', exact)).toBe(false);
    expect(await allowed('https://a.embed.example.com/x', exact)).toBe(false);
    expect(await allowed('https://embed.example.com.evil.com/x', exact)).toBe(false);
    expect(await allowed('https://embed.example.com:8080/x', exact)).toBe(false);
    expect(await allowed('http://embed.example.com/x', exact)).toBe(false);
    expect(await allowed('https://evil.com@embed.example.com/x', exact)).toBe(false);
  });

  it('wildcards match subdomains only, never the apex or suffix tricks', async () => {
    expect(await allowed('https://a.example.com/x', wild)).toBe(true);
    expect(await allowed('https://a.b.example.com/x', wild)).toBe(true);
    expect(await allowed('https://example.com/x', wild)).toBe(false);
    expect(await allowed('https://notexample.com/x', wild)).toBe(false);
    expect(await allowed('https://example.com.evil.com/x', wild)).toBe(false);
    expect(await allowed('https://a.example.com.evil.com/x', wild)).toBe(false);
    expect(await allowed('https://evilexample.com/x', wild)).toBe(false);
  });

  it('custom hosts get a sandbox but no permissions policy', async () => {
    const { html } = await parse(iframe('https://embed.example.com/x'), exact);
    expect(html).toContain('class="embed embed-custom"');
    expect(html).toContain('sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"');
    expect(html).not.toContain(' allow="');
  });

  it('ignores unusable entries', async () => {
    const bad: FeatherdownOptions = {
      embeds: { providers: [], allowHosts: ['*', '*.com', 'https://evil.com', 'evil.com/path', 'user@evil.com', 'evil.com:443', '', '.evil.com'] },
    };
    for (const src of ['https://evil.com/x', 'https://a.evil.com/x', 'https://anything.com/x']) {
      expect(await allowed(src, bad)).toBe(false);
    }
  });

  it('normalizes IDN entries to punycode', async () => {
    const idn: FeatherdownOptions = { embeds: { providers: [], allowHosts: ['bücher.example'] } };
    expect(await allowed('https://xn--bcher-kva.example/x', idn)).toBe(true);
    expect(await allowed('https://bucher.example/x', idn)).toBe(false);
  });
});

describe('embed directives', () => {
  it('::youtube builds a privacy-enhanced canonical URL and goes through the allowlist', async () => {
    const { html, diagnostics } = await parse('::youtube{id="dQw4w9WgXcQ" title="Never gonna" onload="alert(1)" class="evil"}\n');
    expect(diagnostics).toEqual([]);
    expect(html).toContain('<div class="embed embed-youtube"><iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" title="Never gonna"');
    expect(html).not.toContain('onload');
    expect(html).not.toContain('evil');
  });

  it('::vimeo builds a player URL and uses the label as title', async () => {
    const { html } = await parse('::vimeo[My talk]{id="76979871"}\n');
    expect(html).toContain('src="https://player.vimeo.com/video/76979871" title="My talk"');
  });

  it('::embed passes src through the same host checks', async () => {
    expect((await parse('::embed{src="https://codesandbox.io/embed/abc" title="Demo"}\n')).html).toContain(
      'class="embed embed-codesandbox"',
    );
    const blocked = await parse('::embed{src="https://evil.com/x"}\n');
    expect(blocked.html).toBe('');
    expect(blocked.diagnostics.map((d) => d.code)).toEqual(['embeds.blocked']);
  });

  it('directive embeds respect the provider subset', async () => {
    const { html, diagnostics } = await parse('::youtube{id="dQw4w9WgXcQ"}\n', { embeds: { providers: ['vimeo'] } });
    expect(html).toBe('');
    expect(diagnostics.map((d) => d.code)).toEqual(['embeds.blocked']);
  });

  it.each([
    '::embed{src="javascript:alert(1)"}',
    '::embed{src="data:text/html,<script>alert(1)</script>"}',
    '::embed{src="http://www.youtube.com/embed/dQw4w9WgXcQ"}',
    '::embed{srcdoc="<script>alert(1)</script>"}',
    '::youtube{id="dQw4w9WgXcQ/../../x"}',
    '::youtube{id="dQw4w9WgXcQ?autoplay=1&x"}',
    '::youtube{id="https://evil.com/"}',
    '::youtube{id="short"}',
    '::youtube',
    '::vimeo{id="1 onload=alert(1)"}',
    '::vimeo{id="12a"}',
  ])('rejects malicious directive %s', async (md) => {
    const { html, diagnostics } = await parse(`${md}\n`);
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('alert');
    expect(html).not.toContain('evil');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.source).toBe('embeds');
    expect(['embeds.invalid', 'embeds.blocked']).toContain(diagnostics[0]?.code);
  });

  it('attribute-breaking quotes stay inert text', async () => {
    const { html } = await parse('::youtube{id="x\\" onload=\\"alert(1)"}\n');
    expect(html).not.toContain('<iframe');
    expect(html).not.toMatch(/<[^>]+onload/);
  });

  it('does not forward #id / .class shorthands', async () => {
    const { html, diagnostics } = await parse('::vimeo{id="1" .evil}\n');
    expect(diagnostics).toEqual([]);
    expect(html).not.toContain('evil');
  });

  it('strict diagnostics throw on blocked embeds', async () => {
    await expect(parse('::embed{src="https://evil.com/x"}\n', { embeds: true, diagnostics: 'strict' })).rejects.toThrow(
      /strict diagnostics failed/,
    );
  });
});

describe('embeds pipeline integrity', () => {
  it('keeps per-parse allowlists isolated on the cached processor', async () => {
    const a = new Featherdown({ embeds: { providers: [], allowHosts: ['a.example.com'] } });
    const b = new Featherdown({ embeds: { providers: [], allowHosts: ['b.example.com'] } });
    const md = iframe('https://a.example.com/x') + '\n' + iframe('https://b.example.com/x');
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? a : b).parse(md)));
    results.forEach((result, i) => {
      const own = i % 2 === 0 ? 'a' : 'b';
      const other = i % 2 === 0 ? 'b' : 'a';
      expect(iframeCount(result.html)).toBe(1);
      expect(result.html).toContain(`https://${own}.example.com/x`);
      expect(result.html).not.toContain(`${other}.example.com`);
      expect(result.diagnostics.map((d) => d.code)).toEqual(['embeds.blocked']);
    });
  });

  it('honors per-call embed options', async () => {
    const fd = new Featherdown({ embeds: true });
    expect(iframeCount((await fd.parse(iframe(YT))).html)).toBe(1);
    expect(iframeCount((await fd.parse(iframe(YT), { embeds: false })).html)).toBe(0);
    expect(iframeCount((await fd.parse(iframe(YT), { embeds: { providers: ['vimeo'] } })).html)).toBe(0);
  });

  it('fails closed when per-parse config is missing', async () => {
    const html = String(
      await unified()
        .use(remarkParse)
        .use(remarkDirective)
        .use(remarkEmbeds)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeRaw)
        .use(rehypeEmbeds)
        .use(rehypeStringify)
        .process(`${iframe(YT)}\n::youtube{id="dQw4w9WgXcQ"}\n`),
    );
    expect(html).not.toContain('<iframe');
  });

  it('still filters and rebuilds iframes with sanitize: false', async () => {
    const { html } = await parse(iframe(YT, ' srcdoc="x" onload="alert(1)"') + '\n' + iframe('https://evil.com/x'), {
      embeds: true,
      sanitize: false,
    });
    expect(iframeCount(html)).toBe(1);
    expect(html).not.toContain('srcdoc');
    expect(html).not.toContain('onload');
    expect(html).not.toContain('evil.com');
  });

  it('does not change other author content when the gate flips', async () => {
    const md = '# Title\n\n<img src="http://example.com/a.png">\n\n<span style="color:red" onclick="x">s</span>\n\n[^1]\n\n[^1]: note\n';
    const off = await parse(md, {});
    const on = await parse(md, { embeds: true });
    expect(on.html).toBe(off.html);
    expect(on.html).toContain('src="http://example.com/a.png"');
  });

  it('reports the embeds asset feature only when an embed rendered', async () => {
    expect((await parse('::youtube{id="dQw4w9WgXcQ"}\n')).assets.features.embeds).toBe(true);
    expect((await parse('x\n')).assets.features.embeds).toBe(false);
    expect((await parse(`${iframe('https://evil.com/x')}\n`)).assets.features.embeds).toBe(false);
    expect((await parse('::youtube{id="dQw4w9WgXcQ"}\n', {})).assets.features.embeds).toBe(false);
  });

  it('Node entry without mermaid behaves identically', async () => {
    const md = [
      iframe(YT, ' onload="x"'),
      iframe('https://evil.com/x'),
      '::youtube{id="dQw4w9WgXcQ"}',
      '',
      '::embed{src="javascript:alert(1)"}',
      '',
    ].join('\n');
    for (const options of [{ embeds: true }, {}, { embeds: { providers: [], allowHosts: ['*.example.com'] } }] as FeatherdownOptions[]) {
      const main = await new Featherdown(options).parse(md);
      const node = await new NodeFeatherdown(options).parse(md);
      expect(node.html).toBe(main.html);
      expect(node.diagnostics).toEqual(main.diagnostics);
    }
  });
});
