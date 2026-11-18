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

/**
 * Copies well-known publishing keys from parsed front matter into a typed
 * metadata object. Unknown or wrongly typed values are omitted (but remain on
 * `frontmatter`).
 */
export function buildMetadataFromFrontmatter(frontmatter: Record<string, unknown>): FeatherdownMetadata {
  const metadata: FeatherdownMetadata = {};

  if (typeof frontmatter.title === 'string') {
    metadata.title = frontmatter.title;
  }
  if (typeof frontmatter.description === 'string') {
    metadata.description = frontmatter.description;
  }
  const date = normalizeDate(frontmatter.date);
  if (date !== undefined) {
    metadata.date = date;
  }
  const updated = normalizeDate(frontmatter.updated);
  if (updated !== undefined) {
    metadata.updated = updated;
  }
  if (typeof frontmatter.status === 'string') {
    metadata.status = frontmatter.status;
  }
  if (typeof frontmatter.author === 'string') {
    metadata.author = frontmatter.author;
  }

  const tags = frontmatter.tags;
  if (Array.isArray(tags) && tags.length > 0 && tags.every((t) => typeof t === 'string')) {
    metadata.tags = tags.filter((t): t is string => typeof t === 'string');
  }

  return metadata;
}
