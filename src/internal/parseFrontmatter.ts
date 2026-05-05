import yaml from 'js-yaml';

const FRONT_MATTER_FENCE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export type ParseFrontmatterResult = {
  body: string;
  frontmatter: Record<string, unknown>;
  /**
   * True when a leading `---` / `---` fence was found, YAML parsed successfully,
   * and the fence was removed from `body`.
   */
  hasFrontmatter: boolean;
};

function extractFrontMatter(raw: string, yamlMode: 'strict' | 'lenient'): ParseFrontmatterResult {
  if (!raw.startsWith('---')) {
    return { body: raw, frontmatter: {}, hasFrontmatter: false };
  }
  const match = FRONT_MATTER_FENCE.exec(raw);
  if (!match) {
    return { body: raw, frontmatter: {}, hasFrontmatter: false };
  }

  const yamlSource = match[1] ?? '';
  const bodyAfterFence = raw.slice(match[0].length);

  try {
    const loaded: unknown = yaml.load(yamlSource);
    if (loaded === undefined || loaded === null) {
      return { body: bodyAfterFence, frontmatter: {}, hasFrontmatter: true };
    }
    if (typeof loaded !== 'object' || Array.isArray(loaded)) {
      if (yamlMode === 'strict') {
        throw new Error(
          'Front matter root must be a YAML mapping (object), not a list or scalar.',
        );
      }
      return { body: raw, frontmatter: {}, hasFrontmatter: false };
    }
    return {
      body: bodyAfterFence,
      frontmatter: loaded as Record<string, unknown>,
      hasFrontmatter: true,
    };
  } catch (e) {
    if (yamlMode === 'strict') {
      if (e instanceof Error && e.message.startsWith('Front matter')) {
        throw e;
      }
      const detail = e instanceof Error ? e.message : String(e);
      throw new Error(`Front matter YAML could not be parsed: ${detail}`);
    }
    return { body: raw, frontmatter: {}, hasFrontmatter: false };
  }
}

/**
 * Same rules as the public {@link parseMarkdownFile}: throws when YAML is invalid
 * or the document root is not a mapping.
 */
export function extractFrontMatterStrict(raw: string): ParseFrontmatterResult {
  return extractFrontMatter(raw, 'strict');
}

/**
 * When a fence exists but YAML cannot be used, returns the original string and
 * empty front matter (no strip).
 */
export function extractFrontMatterLenient(raw: string): ParseFrontmatterResult {
  return extractFrontMatter(raw, 'lenient');
}

/**
 * @param mode - `false`: do not parse or strip. `true` or `"auto"`: lenient parse when a fence is present.
 */
export function parseFrontmatter(markdown: string, mode: false | true | 'auto'): ParseFrontmatterResult {
  if (mode === false) {
    return { body: markdown, frontmatter: {}, hasFrontmatter: false };
  }
  return extractFrontMatterLenient(markdown);
}
