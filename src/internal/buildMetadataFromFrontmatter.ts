import type { FeatherdownMetadata } from '../types.js';

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
  if (typeof frontmatter.date === 'string') {
    metadata.date = frontmatter.date;
  }
  if (typeof frontmatter.updated === 'string') {
    metadata.updated = frontmatter.updated;
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
