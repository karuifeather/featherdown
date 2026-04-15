import type { RenderMarkdownOptions } from './types.js';
import { createMarkdownProcessorInternal } from './internal/createMarkdownProcessorInternal.js';

export function createMarkdownProcessor(
  options?: RenderMarkdownOptions,
): ReturnType<typeof createMarkdownProcessorInternal> {
  return createMarkdownProcessorInternal(options);
}

