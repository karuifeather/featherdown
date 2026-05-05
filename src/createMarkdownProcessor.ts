import type { RenderMarkdownOptions } from './types.js';
import { createMarkdownProcessorInternal } from './internal/createMarkdownProcessorInternal.js';

/**
 * Create a browser-safe unified processor configured for featherdown defaults.
 *
 * Advanced API for users who need direct unified processor control.
 * Most users should use `Featherdown`.
 *
 * This entrypoint exports the lower-level processor factory so callers can run
 * custom `.process()` flows while still using the package's sanitization and
 * plugin pipeline. Prefer importing from `featherdown/advanced` when wiring
 * unified integrations.
 */
export function createMarkdownProcessor(
  options?: RenderMarkdownOptions,
): ReturnType<typeof createMarkdownProcessorInternal> {
  return createMarkdownProcessorInternal(options);
}

