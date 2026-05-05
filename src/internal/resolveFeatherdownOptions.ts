import type {
  FeatherdownCodeOptions,
  FeatherdownHeadingOptions,
  FeatherdownMathOptions,
  FeatherdownOptions,
  FeatherdownParseOptions,
  FeatherdownPublishingOptions,
  RenderMarkdownOptions,
} from '../types.js';

/** Internal normalized options for {@link Featherdown} after merge + defaults. */
export type ResolvedFeatherdownOptions = {
  kind?: string;
  slug?: string;
  manifest?: RenderMarkdownOptions['manifest'];
  math: { enabled: boolean };
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
    slugs: boolean;
    anchors: boolean;
    toc: boolean;
  };
  publishing: {
    excerpt: boolean;
    wordCount: boolean;
    readingTime: boolean;
  };
  /** `false`: pass-through. `true` | `"auto"`: parse and strip when valid. */
  frontmatter: false | true | 'auto';
};

const DEFAULT_MATH: ResolvedFeatherdownOptions['math'] = { enabled: true };

const DEFAULT_CODE: ResolvedFeatherdownOptions['code'] = {
  enabled: true,
  highlighting: true,
  lineNumbers: false,
  copyButton: true,
};

const DEFAULT_HEADINGS: ResolvedFeatherdownOptions['headings'] = {
  enabled: true,
  slugs: true,
  anchors: true,
  toc: true,
};

const DEFAULT_PUBLISHING: ResolvedFeatherdownOptions['publishing'] = {
  excerpt: true,
  wordCount: true,
  readingTime: true,
};

function mergeFeatherdownMathGroup(
  ctor?: boolean | FeatherdownMathOptions,
  parse?: boolean | FeatherdownMathOptions,
): boolean | FeatherdownMathOptions | undefined {
  if (parse !== undefined) {
    if (typeof parse === 'boolean') {
      return parse;
    }
    if (ctor !== undefined && typeof ctor === 'object') {
      return { ...ctor, ...parse };
    }
    return { ...parse };
  }
  return ctor;
}

function mergeFeatherdownCodeGroup(
  ctor?: boolean | FeatherdownCodeOptions,
  parse?: boolean | FeatherdownCodeOptions,
): boolean | FeatherdownCodeOptions | undefined {
  if (parse !== undefined) {
    if (typeof parse === 'boolean') {
      return parse;
    }
    if (ctor !== undefined && typeof ctor === 'object') {
      return { ...ctor, ...parse };
    }
    return { ...parse };
  }
  return ctor;
}

function mergeFeatherdownHeadingsGroup(
  ctor?: boolean | FeatherdownHeadingOptions,
  parse?: boolean | FeatherdownHeadingOptions,
): boolean | FeatherdownHeadingOptions | undefined {
  if (parse !== undefined) {
    if (typeof parse === 'boolean') {
      return parse;
    }
    if (ctor !== undefined && typeof ctor === 'object') {
      return { ...ctor, ...parse };
    }
    return { ...parse };
  }
  return ctor;
}

function mergeFeatherdownPublishingGroup(
  ctor?: boolean | FeatherdownPublishingOptions,
  parse?: boolean | FeatherdownPublishingOptions,
): boolean | FeatherdownPublishingOptions | undefined {
  if (parse !== undefined) {
    if (typeof parse === 'boolean') {
      return parse;
    }
    if (ctor !== undefined && typeof ctor === 'object') {
      return { ...ctor, ...parse };
    }
    return { ...parse };
  }
  return ctor;
}

/**
 * Shallow-merge constructor and per-call options (parse wins on key conflicts).
 * Nested groups (math, code, headings, publishing) use a one-level object merge
 * when both sides supply objects.
 */
export function mergeFeatherdownOptions(
  constructorOptions?: FeatherdownOptions,
  parseOptions?: FeatherdownParseOptions,
): FeatherdownOptions | undefined {
  if (constructorOptions === undefined && parseOptions === undefined) {
    return undefined;
  }
  const out: FeatherdownOptions = { ...constructorOptions, ...parseOptions };

  const mathMerged = mergeFeatherdownMathGroup(constructorOptions?.math, parseOptions?.math);
  if (mathMerged !== undefined) {
    out.math = mathMerged;
  }

  const codeMerged = mergeFeatherdownCodeGroup(constructorOptions?.code, parseOptions?.code);
  if (codeMerged !== undefined) {
    out.code = codeMerged;
  }

  const headingsMerged = mergeFeatherdownHeadingsGroup(constructorOptions?.headings, parseOptions?.headings);
  if (headingsMerged !== undefined) {
    out.headings = headingsMerged;
  }

  const publishingMerged = mergeFeatherdownPublishingGroup(constructorOptions?.publishing, parseOptions?.publishing);
  if (publishingMerged !== undefined) {
    out.publishing = publishingMerged;
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
    return { enabled: value };
  }
  return {
    enabled: value.enabled ?? base.enabled,
  };
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
      return {
        enabled: false,
        slugs: false,
        anchors: false,
        toc: false,
      };
    }
    return { ...DEFAULT_HEADINGS };
  }
  return {
    enabled: true,
    slugs: value.slugs ?? base.slugs,
    anchors: value.anchors ?? base.anchors,
    toc: value.toc ?? base.toc,
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
  };
}
