import { createMarkdownProcessor } from './internal/createMarkdownProcessor.js';

const processor = createMarkdownProcessor();

export async function renderMarkdownToHtml(markdown: string): Promise<string> {
  const file = await processor.process(markdown);
  return String(file);
}
