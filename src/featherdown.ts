import { mergeFeatherdownOptions } from './internal/resolveFeatherdownOptions.js';
import { runFeatherdownParse } from './internal/runFeatherdownParse.js';
import type { FeatherdownOptions, FeatherdownParseOptions, FeatherdownResult } from './types.js';

/**
 * Primary user-facing API for rendering Markdown with publishing metadata.
 *
 * Prefer this class over legacy helpers such as `renderMarkdownDocument` or
 * `renderMarkdownToHtml`; those remain for compatibility.
 */
export class Featherdown {
  private readonly defaultOptions: FeatherdownOptions | undefined;

  constructor(options?: FeatherdownOptions) {
    this.defaultOptions = options;
  }

  /**
   * Render Markdown to HTML and document metadata. Constructor options are merged
   * with per-call options; per-call values win. Nested option groups use a
   * shallow one-level merge.
   */
  async parse(markdown: string, parseOptions?: FeatherdownParseOptions): Promise<FeatherdownResult> {
    return runFeatherdownParse(markdown, mergeFeatherdownOptions(this.defaultOptions, parseOptions));
  }
}
