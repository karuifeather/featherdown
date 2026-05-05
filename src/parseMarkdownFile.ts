import { extractFrontMatterStrict } from './internal/parseFrontmatter.js';

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
 * @deprecated Prefer `new Featherdown({ frontmatter: "auto" }).parse(markdown)` for new code.
 * That path returns a full `FeatherdownResult`; this function uses a separate strict front-matter-only contract.
 * This strict front matter utility remains available for compatibility.
 *
 * Throws when front matter exists but is invalid YAML, or when the root value
 * is not a mapping object.
 */
export function parseMarkdownFile(raw: string): ParsedMarkdownFile {
  const { body, frontmatter } = extractFrontMatterStrict(raw);
  return { frontMatter: frontmatter, content: body };
}
