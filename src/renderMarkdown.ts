import { createMarkdownProcessorInternal } from './internal/createMarkdownProcessorInternal.js';
import { createDiagnosticCollector } from './internal/diagnostics.js';
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
  const collector = createDiagnosticCollector();
  const processor = createMarkdownProcessorInternal({
    ...options,
    emitDiagnostic: collector.emit,
  });
  const file = await processor.process(markdown);
  return { html: String(file), diagnostics: collector.diagnostics };
}

