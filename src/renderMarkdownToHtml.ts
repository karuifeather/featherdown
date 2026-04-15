import { renderMarkdown } from './renderMarkdown.js';
import type { RenderMarkdownOptions } from './types.js';

/**
 * Render Markdown to sanitized HTML with featherdown defaults.
 *
 * This is the simplest public API for callers that only need HTML output and
 * do not need diagnostics.
 */
export async function renderMarkdownToHtml(
  markdown: string,
  options?: RenderMarkdownOptions,
): Promise<string> {
  const result = await renderMarkdown(markdown, options);
  return result.html;
}
