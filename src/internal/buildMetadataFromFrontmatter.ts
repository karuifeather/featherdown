import type { FeatherdownMetadata } from '../types.js';

/**
 * Normalizes a front matter date value to a string.
 *
 * YAML parses unquoted `date: 2026-01-02` into a `Date` (at UTC midnight).
 * Date-only values become `YYYY-MM-DD`; values with a time component become a
 * full ISO string. Invalid dates and other types are dropped.
 */
function normalizeDate(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Date) {
    const time = value.getTime();
    if (Number.isNaN(time)) {
      return undefined;
    }
    const iso = value.toISOString();
    return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso;
  }
  return undefined;
}

function firstString(frontmatter: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = frontmatter[key];
    if (typeof value === 'string') {
      return value;
    }
  }
  return undefined;
}

/** First usable value among `keys`: a string, or an object with a string `src` / `url`. */
function firstImage(frontmatter: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = frontmatter[key];
    if (typeof value === 'string') {
      return value;
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      if (typeof record.src === 'string') return record.src;
      if (typeof record.url === 'string') return record.url;
    }
  }
  return undefined;
}

function firstDate(frontmatter: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const date = normalizeDate(frontmatter[key]);
    if (date !== undefined) return date;
  }
  return undefined;
}

/** A single string is one entry; an array must be non-empty and all strings. */
function stringList(value: unknown): string[] | undefined {
  if (typeof value === 'string') {
    return value.length > 0 ? [value] : undefined;
  }
  if (Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'string')) {
    return [...value];
  }
  return undefined;
}

/** Comma-separated string or all-string array, trimmed, empties dropped. */
function keywordList(value: unknown): string[] | undefined {
  let parts: string[];
  if (typeof value === 'string') {
    parts = value.split(',');
  } else if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
    parts = value;
  } else {
    return undefined;
  }
  const list = parts.map((p) => p.trim()).filter((p) => p.length > 0);
  return list.length > 0 ? list : undefined;
}

/**
 * Copies well-known publishing keys from parsed front matter into a typed
 * metadata object. Unknown or wrongly typed values are omitted (but remain on
 * `frontmatter`).
 */
export function buildMetadataFromFrontmatter(frontmatter: Record<string, unknown>): FeatherdownMetadata {
  const metadata: FeatherdownMetadata = {};

  const title = firstString(frontmatter, ['title']);
  if (title !== undefined) metadata.title = title;

  const description = firstString(frontmatter, ['description', 'summary', 'excerpt']);
  if (description !== undefined) metadata.description = description;

  const date = firstDate(frontmatter, ['date']);
  if (date !== undefined) metadata.date = date;

  const updated = firstDate(frontmatter, ['updated', 'lastmod', 'modified']);
  if (updated !== undefined) metadata.updated = updated;

  if (typeof frontmatter.status === 'string') {
    metadata.status = frontmatter.status;
  }
  if (typeof frontmatter.author === 'string') {
    metadata.author = frontmatter.author;
  }

  // An explicit boolean `draft` wins; otherwise `status: draft` implies a draft.
  if (typeof frontmatter.draft === 'boolean') {
    metadata.draft = frontmatter.draft;
  } else if (typeof frontmatter.status === 'string' && frontmatter.status.trim().toLowerCase() === 'draft') {
    metadata.draft = true;
  }

  const tags = stringList(frontmatter.tags);
  if (tags) metadata.tags = tags;

  const categories = stringList(frontmatter.categories);
  if (categories) metadata.categories = categories;

  const image = firstImage(frontmatter, ['image', 'cover', 'ogImage']);
  if (image !== undefined) metadata.image = image;

  const canonical = firstString(frontmatter, ['canonical', 'canonicalUrl', 'canonical_url']);
  if (canonical !== undefined) metadata.canonical = canonical;

  const slug = firstString(frontmatter, ['slug']);
  if (slug !== undefined) metadata.slug = slug;

  const lang = firstString(frontmatter, ['lang', 'language']);
  if (lang !== undefined) metadata.lang = lang;

  const keywords = keywordList(frontmatter.keywords);
  if (keywords) metadata.keywords = keywords;

  return metadata;
}
