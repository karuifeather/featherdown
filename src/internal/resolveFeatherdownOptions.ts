import type {
  FeatherdownCodeOptions,
  FeatherdownEmbedOptions,
  FeatherdownEmbedProvider,
  FeatherdownHeadingOptions,
  FeatherdownImageOptions,
  FeatherdownLinkOptions,
  FeatherdownMathOptions,
  FeatherdownOptions,
  FeatherdownParseOptions,
  FeatherdownPlugins,
  FeatherdownPublishingOptions,
  RenderMarkdownOptions,
} from '../types.js';

export const EMBED_PROVIDERS: readonly FeatherdownEmbedProvider[] = [
  'youtube',
  'vimeo',
  'codepen',
  'codesandbox',
  'stackblitz',
];

/** Internal normalized options for {@link Featherdown} after merge + defaults. */
export type ResolvedFeatherdownOptions = {
  kind?: string;
  slug?: string;
  manifest?: RenderMarkdownOptions['manifest'];
  math: {
    enabled: boolean;
    macros: Record<string, string>;
    trust: boolean;
    strict: 'ignore' | 'warn' | 'error';
  };
  code: {
    enabled: boolean;
    highlighting: boolean;
    lineNumbers: boolean;
    copyButton: boolean;
  };
  sanitize: boolean;
  diagnostics: { enabled: boolean; mode: 'warn' | 'strict' };
  charts: boolean;
  headings: {
    enabled: boolean;
    toc: boolean;
    minDepth: number;
    maxDepth: number;
  };
  alerts: boolean;
  details: boolean;
  links: {
    enabled: boolean;
    rel: string | false;
    target: string | false;
    internalHosts: string[];
  };
  images: {
    enabled: boolean;
    lazy: boolean;
    decoding: 'async' | 'sync' | 'auto' | false;
    figure: boolean;
  };
  embeds: {
    enabled: boolean;
    providers: FeatherdownEmbedProvider[];
    allowHosts: string[];
  };
  plugins?: FeatherdownPlugins;
  publishing: {
    excerpt: boolean;
    wordCount: boolean;
    readingTime: boolean;
  };
  /** `false`: pass-through. `true` | `"auto"`: parse and strip when valid. */
  frontmatter: false | true | 'auto';
};

const DEFAULT_MATH: ResolvedFeatherdownOptions['math'] = {
  enabled: true,
  macros: {},
  trust: false,
  strict: 'ignore',
};

const DEFAULT_CODE: ResolvedFeatherdownOptions['code'] = {
  enabled: true,
  highlighting: true,
  lineNumbers: false,
  copyButton: false,
};

const DEFAULT_HEADINGS: ResolvedFeatherdownOptions['headings'] = {
  enabled: true,
  toc: true,
  minDepth: 1,
  maxDepth: 6,
};

const DEFAULT_LINKS: Omit<ResolvedFeatherdownOptions['links'], 'enabled'> = {
  rel: 'noopener noreferrer',
  target: '_blank',
  internalHosts: [],
};

const DEFAULT_IMAGES: Omit<ResolvedFeatherdownOptions['images'], 'enabled'> = {
  lazy: true,
  decoding: 'async',
  figure: false,
};

const DEFAULT_PUBLISHING: ResolvedFeatherdownOptions['publishing'] = {
  excerpt: true,
  wordCount: true,
  readingTime: true,
};

/**
 * One-level merge of a `boolean | object` option group; parse wins.
 *
 * - parse `true` + ctor object: keep the ctor's settings (re-enabling them).
 * - parse object + ctor `false`: the group stays disabled unless the parse
 *   object sets `enabled: true` (groups without an `enabled` field, such as
 *   links / images / embeds, are enabled by passing an object).
 * - both objects: shallow merge.
 */
function mergeGroup<T extends object>(
  ctor: boolean | T | undefined,
  parse: boolean | T | undefined,
  hasEnabledField: boolean,
): boolean | T | undefined {
  if (parse === undefined) {
    return ctor;
  }
  if (parse === false) {
    return false;
  }
  if (parse === true) {
    if (ctor !== undefined && typeof ctor === 'object') {
      return hasEnabledField ? { ...ctor, enabled: true } : { ...ctor };
    }
    return true;
  }
  // Tuning a disabled group (math / code) does not silently turn it back on.
  if (ctor === false && hasEnabledField && (parse as { enabled?: unknown }).enabled === undefined) {
    return { ...parse, enabled: false };
  }
  if (ctor !== undefined && typeof ctor === 'object') {
    return { ...ctor, ...parse };
  }
  return { ...parse };
}

/**
 * Shallow-merge constructor and per-call options (parse wins on key conflicts).
 * Nested groups (math, code, headings, publishing, links, images, embeds) use a
 * one-level object merge when both sides supply objects. Plugin lists concatenate
 * (constructor plugins first).
 */
export function mergeFeatherdownOptions(
  constructorOptions?: FeatherdownOptions,
  parseOptions?: FeatherdownParseOptions,
): FeatherdownOptions | undefined {
  if (constructorOptions === undefined && parseOptions === undefined) {
    return undefined;
  }
  const out: FeatherdownOptions = { ...constructorOptions, ...parseOptions };

  const groups = ['math', 'code', 'headings', 'publishing', 'links', 'images', 'embeds'] as const;
  // Groups whose object form carries an `enabled` switch.
  const withEnabledField = new Set<string>(['math', 'code']);
  for (const key of groups) {
    const merged = mergeGroup<object>(constructorOptions?.[key], parseOptions?.[key], withEnabledField.has(key));
    if (merged !== undefined) {
      (out as Record<string, unknown>)[key] = merged;
    }
  }

  // `mergeGroup` is one level deep, so macros would be replaced wholesale.
  const ctorMath = constructorOptions?.math;
  const parseMath = parseOptions?.math;
  if (
    typeof ctorMath === 'object' &&
    typeof parseMath === 'object' &&
    ctorMath.macros !== undefined &&
    parseMath.macros !== undefined &&
    typeof out.math === 'object'
  ) {
    out.math = { ...out.math, macros: { ...ctorMath.macros, ...parseMath.macros } };
  }

  if (constructorOptions?.plugins || parseOptions?.plugins) {
    const remark = [...(constructorOptions?.plugins?.remark ?? []), ...(parseOptions?.plugins?.remark ?? [])];
    const rehype = [...(constructorOptions?.plugins?.rehype ?? []), ...(parseOptions?.plugins?.rehype ?? [])];
    // Keep the constructor's object identity when the parse call adds nothing,
    // so the processor cache can reuse the instance's processor.
    // Keep object identity when only one side has plugins, so the processor
    // cache (keyed by the plugins object) hits across parse calls.
    out.plugins =
      parseOptions?.plugins === undefined && constructorOptions?.plugins
        ? constructorOptions.plugins
        : constructorOptions?.plugins === undefined && parseOptions?.plugins
          ? parseOptions.plugins
          : { remark, rehype };
  }

  return out;
}

function normalizeMath(
  value: boolean | FeatherdownMathOptions | undefined,
  base: ResolvedFeatherdownOptions['math'],
): ResolvedFeatherdownOptions['math'] {
  if (value === undefined) {
    return { ...base };
  }
  if (typeof value === 'boolean') {
    return { ...base, macros: { ...base.macros }, enabled: value };
  }
  return {
    enabled: value.enabled ?? base.enabled,
    macros: normalizeMacros(value.macros, base.macros),
    trust: value.trust ?? base.trust,
    strict: normalizeMathStrict(value.strict, base.strict),
  };
}

/** Keeps only string-to-string macro entries; the result is a fresh object. */
function normalizeMacros(
  value: Record<string, string> | undefined,
  base: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = { ...base };
  if (value) {
    for (const [name, body] of Object.entries(value)) {
      if (typeof body === 'string') {
        out[name] = body;
      }
    }
  }
  return out;
}

function normalizeMathStrict(
  value: FeatherdownMathOptions['strict'],
  base: ResolvedFeatherdownOptions['math']['strict'],
): ResolvedFeatherdownOptions['math']['strict'] {
  if (value === undefined) {
    return base;
  }
  if (value === true || value === 'error') {
    return 'error';
  }
  return value === 'warn' ? 'warn' : 'ignore';
}

function normalizeCode(
  value: boolean | FeatherdownCodeOptions | undefined,
  base: ResolvedFeatherdownOptions['code'],
): ResolvedFeatherdownOptions['code'] {
  if (value === undefined) {
    return { ...base };
  }
  if (typeof value === 'boolean') {
    return {
      ...base,
      enabled: value,
    };
  }
  return {
    enabled: value.enabled ?? base.enabled,
    highlighting: value.highlighting ?? base.highlighting,
    lineNumbers: value.lineNumbers ?? base.lineNumbers,
    copyButton: value.copyButton ?? base.copyButton,
  };
}

function normalizeHeadings(
  value: boolean | FeatherdownHeadingOptions | undefined,
  base: ResolvedFeatherdownOptions['headings'],
): ResolvedFeatherdownOptions['headings'] {
  if (value === undefined) {
    return { ...base };
  }
  if (typeof value === 'boolean') {
    if (!value) {
      return { ...DEFAULT_HEADINGS, enabled: false, toc: false };
    }
    return { ...DEFAULT_HEADINGS };
  }
  return {
    enabled: true,
    toc: value.toc ?? base.toc,
    minDepth: clampDepth(value.minDepth, base.minDepth),
    maxDepth: clampDepth(value.maxDepth, base.maxDepth),
  };
}

function clampDepth(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(6, Math.max(1, Math.trunc(value)));
}

function normalizeLinks(value: boolean | FeatherdownLinkOptions | undefined): ResolvedFeatherdownOptions['links'] {
  if (value === undefined || value === false) {
    return { enabled: false, ...DEFAULT_LINKS };
  }
  if (value === true) {
    return { enabled: true, ...DEFAULT_LINKS };
  }
  return {
    enabled: true,
    rel: value.rel ?? DEFAULT_LINKS.rel,
    target: value.target ?? DEFAULT_LINKS.target,
    internalHosts: value.internalHosts ?? DEFAULT_LINKS.internalHosts,
  };
}

function normalizeImages(value: boolean | FeatherdownImageOptions | undefined): ResolvedFeatherdownOptions['images'] {
  if (value === undefined || value === false) {
    return { enabled: false, ...DEFAULT_IMAGES };
  }
  if (value === true) {
    return { enabled: true, ...DEFAULT_IMAGES };
  }
  return {
    enabled: true,
    lazy: value.lazy ?? DEFAULT_IMAGES.lazy,
    decoding: value.decoding ?? DEFAULT_IMAGES.decoding,
    figure: value.figure ?? DEFAULT_IMAGES.figure,
  };
}

function normalizeEmbeds(value: boolean | FeatherdownEmbedOptions | undefined): ResolvedFeatherdownOptions['embeds'] {
  if (value === undefined || value === false) {
    return { enabled: false, providers: [...EMBED_PROVIDERS], allowHosts: [] };
  }
  if (value === true) {
    return { enabled: true, providers: [...EMBED_PROVIDERS], allowHosts: [] };
  }
  return {
    enabled: true,
    providers: (value.providers ?? [...EMBED_PROVIDERS]).filter((p) => EMBED_PROVIDERS.includes(p)),
    allowHosts: value.allowHosts ?? [],
  };
}

function normalizePublishing(
  value: boolean | FeatherdownPublishingOptions | undefined,
  base: ResolvedFeatherdownOptions['publishing'],
): ResolvedFeatherdownOptions['publishing'] {
  if (value === undefined) {
    return { ...base };
  }
  if (typeof value === 'boolean') {
    if (!value) {
      return { excerpt: false, wordCount: false, readingTime: false };
    }
    return { ...DEFAULT_PUBLISHING };
  }
  return {
    excerpt: value.excerpt ?? base.excerpt,
    wordCount: value.wordCount ?? base.wordCount,
    readingTime: value.readingTime ?? base.readingTime,
  };
}

function normalizeFrontmatter(value: FeatherdownOptions['frontmatter'] | undefined): false | true | 'auto' {
  if (value === true || value === 'auto') {
    return value;
  }
  return false;
}

function normalizeDiagnostics(
  value: boolean | 'warn' | 'strict' | undefined,
): ResolvedFeatherdownOptions['diagnostics'] {
  if (value === undefined) {
    return { enabled: true, mode: 'warn' };
  }
  if (value === false) {
    return { enabled: false, mode: 'warn' };
  }
  if (value === true) {
    return { enabled: true, mode: 'warn' };
  }
  return { enabled: true, mode: value };
}

/**
 * Apply defaults and boolean/object normalization for {@link Featherdown}.
 */
export function resolveFeatherdownOptions(raw?: FeatherdownOptions): ResolvedFeatherdownOptions {
  const mergedNested = raw ?? {};

  return {
    ...(mergedNested.kind !== undefined ? { kind: mergedNested.kind } : {}),
    ...(mergedNested.slug !== undefined ? { slug: mergedNested.slug } : {}),
    ...(mergedNested.manifest !== undefined ? { manifest: mergedNested.manifest } : {}),
    math: normalizeMath(mergedNested.math, DEFAULT_MATH),
    code: normalizeCode(mergedNested.code, DEFAULT_CODE),
    sanitize: mergedNested.sanitize ?? true,
    diagnostics: normalizeDiagnostics(mergedNested.diagnostics),
    charts: mergedNested.charts ?? true,
    headings: normalizeHeadings(mergedNested.headings, DEFAULT_HEADINGS),
    publishing: normalizePublishing(mergedNested.publishing, DEFAULT_PUBLISHING),
    frontmatter: normalizeFrontmatter(mergedNested.frontmatter),
    alerts: mergedNested.alerts ?? true,
    details: mergedNested.details ?? true,
    links: normalizeLinks(mergedNested.links),
    images: normalizeImages(mergedNested.images),
    embeds: normalizeEmbeds(mergedNested.embeds),
    ...(mergedNested.plugins !== undefined ? { plugins: mergedNested.plugins } : {}),
  };
}
