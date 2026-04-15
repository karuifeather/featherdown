import yaml from 'js-yaml';

export function parseMarkdownFile(raw: string): {
  frontMatter: Record<string, unknown>;
  content: string;
} {
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
