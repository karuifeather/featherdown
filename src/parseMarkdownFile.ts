import yaml from 'js-yaml';

/**
 * Parse Markdown content with optional YAML front matter.
 *
 * Exports a small utility that splits a raw Markdown file into front matter
 * metadata and content body for downstream rendering pipelines.
 */

/**
 * Parsed result from a Markdown file with optional front matter.
 */
export type ParsedMarkdownFile = {
  /**
   * YAML front matter object. Empty when front matter is missing.
   */
  frontMatter: Record<string, unknown>;
  /**
   * Markdown body content after the front matter fence.
   */
  content: string;
};

/**
 * Reads optional YAML front matter and returns metadata plus Markdown body.
 *
 * Throws when front matter exists but is invalid YAML, or when the root value
 * is not a mapping object.
 */
export function parseMarkdownFile(raw: string): ParsedMarkdownFile {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
  if (!raw.startsWith('---') || !match) {
    return { frontMatter: {}, content: raw };
  }

  const yamlSource = match[1] ?? '';
  const content = raw.slice(match[0].length);

  try {
    const loaded: unknown = yaml.load(yamlSource);
    if (loaded === undefined || loaded === null) {
      return { frontMatter: {}, content };
    }
    if (typeof loaded !== 'object' || Array.isArray(loaded)) {
      throw new Error(
        'Front matter root must be a YAML mapping (object), not a list or scalar.',
      );
    }
    return { frontMatter: loaded as Record<string, unknown>, content };
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Front matter')) {
      throw e;
    }
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`Front matter YAML could not be parsed: ${detail}`);
  }
}
