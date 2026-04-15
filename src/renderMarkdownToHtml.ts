import { createMarkdownProcessor } from './internal/createMarkdownProcessor.js';

type RenderMarkdownOptions = {
  kind?: string;
  slug?: string;
  manifest?: {
    map?: Record<string, { url: string }>;
    remote?: Record<string, { url: string }>;
  };
};

export async function renderMarkdownToHtml(
  markdown: string,
  options?: RenderMarkdownOptions,
): Promise<string> {
  const processor = createMarkdownProcessor(options);
  const file = await processor.process(markdown);
  return String(file);
}
