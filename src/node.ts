import { createMarkdownProcessorWithMermaidInternal } from './internal/createMarkdownProcessorWithMermaidInternal.js';
import type { RenderMarkdownOptions } from './types.js';

/**
 * Node-only Mermaid rendering entrypoint.
 *
 * Renders Markdown to sanitized HTML with Mermaid diagrams expanded to inline
 * SVG using the Node publishing pipeline. If an individual Mermaid block fails
 * to render, that block is preserved as a normal code fence while the rest of
 * the document continues rendering.
 */
export async function renderMarkdownToHtmlWithMermaid(
  markdown: string,
  options?: RenderMarkdownOptions,
): Promise<string> {
  const processor = createMarkdownProcessorWithMermaidInternal(options);
  const file = await processor.process(markdown);
  return String(file);
}

/**
 * Shared rendering options used by the Node Mermaid entrypoint.
 */
export type { RenderMarkdownOptions } from './types.js';

