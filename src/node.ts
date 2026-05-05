import { createMarkdownProcessorWithMermaidInternal } from './internal/createMarkdownProcessorWithMermaidInternal.js';
import type { RenderMarkdownOptions } from './types.js';

/**
 * Node-only Mermaid rendering entrypoint.
 *
 * @deprecated Prefer `new Featherdown({ mermaid: { render: "svg" } }).parse(markdown)` from `featherdown/node`.
 * This helper remains available for compatibility.
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

export { Featherdown } from './nodeFeatherdown.js';
export { FeatherdownDiagnosticsError } from './featherdownDiagnosticsError.js';
export type {
  NodeFeatherdownMermaidOptions,
  NodeFeatherdownOptions,
  NodeFeatherdownParseOptions,
} from './nodeTypes.js';

/**
 * Shared rendering options used by the Node Mermaid entrypoint.
 */
export type { RenderMarkdownOptions } from './types.js';
