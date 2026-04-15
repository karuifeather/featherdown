import type { RenderMarkdownOptions } from './types.js';
import { createMarkdownProcessorInternal } from './internal/createMarkdownProcessorInternal.js';

/**
 * Create a browser-safe unified processor configured for featherdown defaults.
 *
 * This entrypoint exports the lower-level processor factory so callers can run
 * custom `.process()` flows while still using the package's sanitization and
 * plugin pipeline.
 */
export function createMarkdownProcessor(
  options?: RenderMarkdownOptions,
): ReturnType<typeof createMarkdownProcessorInternal> {
  return createMarkdownProcessorInternal(options);
}

