import { renderMarkdown } from './renderMarkdown.js';
import type { RenderMarkdownOptions } from './types.js';

export async function renderMarkdownToHtml(
  markdown: string,
  options?: RenderMarkdownOptions,
): Promise<string> {
  const result = await renderMarkdown(markdown, options);
  return result.html;
}
