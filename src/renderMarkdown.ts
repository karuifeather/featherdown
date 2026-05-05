import { renderMarkdownDocument } from './renderMarkdownDocument.js';
import type { RenderDiagnostic, RenderMarkdownOptions } from './types.js';

/**
 * Render Markdown to sanitized HTML and collect non-fatal diagnostics.
 *
 * @deprecated Prefer `new Featherdown().parse(markdown)` for new code.
 * This helper accepts `RenderMarkdownOptions` only—not full `FeatherdownOptions`.
 * This helper remains available for compatibility.
 *
 * This entrypoint is useful when callers want warning metadata in addition to
 * the final HTML string.
 */
export async function renderMarkdown(
  markdown: string,
  options?: RenderMarkdownOptions,
): Promise<{ html: string; diagnostics: RenderDiagnostic[] }> {
  const result = await renderMarkdownDocument(markdown, options);
  return { html: result.html, diagnostics: result.diagnostics };
}
