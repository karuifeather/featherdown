import { createMarkdownProcessorWithMermaidInternal } from './internal/createMarkdownProcessorWithMermaidInternal.js';
import type { RenderMarkdownOptions } from './types.js';

export async function renderMarkdownToHtmlWithMermaid(
  markdown: string,
  options?: RenderMarkdownOptions,
): Promise<string> {
  const processor = createMarkdownProcessorWithMermaidInternal(options);
  const file = await processor.process(markdown);
  return String(file);
}

export type { RenderMarkdownOptions } from './types.js';

