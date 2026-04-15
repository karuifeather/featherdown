import { createMarkdownProcessor } from './internal/createMarkdownProcessor.js';
import { createDiagnosticCollector } from './internal/diagnostics.js';
import type { RenderDiagnostic, RenderMarkdownOptions } from './types.js';

export async function renderMarkdown(
  markdown: string,
  options?: RenderMarkdownOptions,
): Promise<{ html: string; diagnostics: RenderDiagnostic[] }> {
  const collector = createDiagnosticCollector();
  const processor = createMarkdownProcessor({ ...options, emitDiagnostic: collector.emit });
  const file = await processor.process(markdown);
  return { html: String(file), diagnostics: collector.diagnostics };
}

