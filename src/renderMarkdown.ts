import { renderMarkdownDocumentInternal } from './internal/renderMarkdownDocumentInternal.js';
import type { RenderDiagnostic, RenderMarkdownOptions } from './types.js';

/**
 * Render Markdown to sanitized HTML and collect non-fatal diagnostics.
 *
 * This entrypoint is useful when callers want warning metadata in addition to
 * the final HTML string.
 */
export async function renderMarkdown(
  markdown: string,
  options?: RenderMarkdownOptions,
): Promise<{ html: string; diagnostics: RenderDiagnostic[] }> {
  const result = await renderMarkdownDocumentInternal(markdown, options);
  return { html: result.html, diagnostics: result.diagnostics };
}

