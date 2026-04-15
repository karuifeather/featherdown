import { renderMarkdownDocumentInternal } from './internal/renderMarkdownDocumentInternal.js';
import type { RenderMarkdownDocumentResult, RenderMarkdownOptions } from './types.js';

/**
 * Render Markdown to sanitized HTML and extract publishing metadata from the
 * final rendered document structure.
 */
export async function renderMarkdownDocument(
  markdown: string,
  options?: RenderMarkdownOptions,
): Promise<RenderMarkdownDocumentResult> {
  return renderMarkdownDocumentInternal(markdown, options);
}
