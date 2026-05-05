import { renderMarkdownDocumentInternal } from './internal/renderMarkdownDocumentInternal.js';
import type { RenderMarkdownDocumentResult, RenderMarkdownOptions } from './types.js';

/**
 * Render Markdown to sanitized HTML and extract publishing metadata from the
 * final rendered document structure.
 *
 * @deprecated Prefer `new Featherdown().parse(markdown)` for new code.
 * This helper accepts `RenderMarkdownOptions` only—not full `FeatherdownOptions`.
 * This helper remains available for compatibility.
 */
export async function renderMarkdownDocument(
  markdown: string,
  options?: RenderMarkdownOptions,
): Promise<RenderMarkdownDocumentResult> {
  return renderMarkdownDocumentInternal(markdown, options);
}
