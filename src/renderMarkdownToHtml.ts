import { renderMarkdownDocument } from './renderMarkdownDocument.js';
import type { RenderMarkdownOptions } from './types.js';

/**
 * Render Markdown to sanitized HTML with featherdown defaults.
 *
 * @deprecated Prefer `(await new Featherdown().parse(markdown)).html` for new code.
 * This helper accepts `RenderMarkdownOptions` only—not full `FeatherdownOptions`.
 * This helper remains available for compatibility.
 *
 * This is the simplest public API for callers that only need HTML output and
 * do not need diagnostics.
 */
export async function renderMarkdownToHtml(
  markdown: string,
  options?: RenderMarkdownOptions,
): Promise<string> {
  const result = await renderMarkdownDocument(markdown, options);
  return result.html;
}
