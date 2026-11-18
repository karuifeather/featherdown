import { describe, expect, it } from 'vitest';
import { Featherdown } from '../src/index.js';
import { mergeFeatherdownOptions, resolveFeatherdownOptions } from '../src/internal/resolveFeatherdownOptions.js';

const resolve = (ctor: Parameters<typeof mergeFeatherdownOptions>[0], parse: Parameters<typeof mergeFeatherdownOptions>[1]) =>
  resolveFeatherdownOptions(mergeFeatherdownOptions(ctor, parse));

describe('option group merging', () => {
  it('parse `true` keeps constructor settings for a group', () => {
    const r = resolve({ links: { internalHosts: ['me.com'] } }, { links: true });
    expect(r.links).toMatchObject({ enabled: true, internalHosts: ['me.com'] });
    const e = resolve({ embeds: { allowHosts: ['*.example.org'] } }, { embeds: true });
    expect(e.embeds.allowHosts).toEqual(['*.example.org']);
  });

  it('parse `true` re-enables a constructor object that had enabled: false', () => {
    expect(resolve({ code: { enabled: false, lineNumbers: true } }, { code: true }).code).toMatchObject({
      enabled: true,
      lineNumbers: true,
    });
  });

  it('tuning a disabled math/code group does not re-enable it', () => {
    expect(resolve({ code: false }, { code: { lineNumbers: true } }).code.enabled).toBe(false);
    expect(resolve({ code: false }, { code: { enabled: true, lineNumbers: true } }).code.enabled).toBe(true);
  });

  it('parse false disables a group configured on the constructor', () => {
    expect(resolve({ links: { rel: 'nofollow' } }, { links: false }).links.enabled).toBe(false);
  });

  it('keeps internal hosts internal end to end', async () => {
    const fd = new Featherdown({ links: { internalHosts: ['me.com'] } });
    const { html } = await fd.parse('[a](https://me.com/x) [b](https://x.com)', { links: true });
    expect(html).toContain('<a href="https://me.com/x">a</a>');
    expect(html).toContain('<a href="https://x.com" rel="noopener noreferrer" target="_blank">b</a>');
  });

  it('reuses the per-parse plugins object when only parse supplies plugins', () => {
    const plugins = { remark: [] };
    expect(mergeFeatherdownOptions({}, { plugins })?.plugins).toBe(plugins);
  });
});
