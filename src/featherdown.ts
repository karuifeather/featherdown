import { buildFeatherdownResult } from './internal/buildFeatherdownResult.js';
import { buildMetadataFromFrontmatter } from './internal/buildMetadataFromFrontmatter.js';
import { pickRenderMarkdownOptions, toProcessorGates } from './internal/featherdownParseHelpers.js';
import { parseFrontmatter } from './internal/parseFrontmatter.js';
import { renderMarkdownDocumentInternal } from './internal/renderMarkdownDocumentInternal.js';
import { mergeFeatherdownOptions, resolveFeatherdownOptions } from './internal/resolveFeatherdownOptions.js';
import { throwIfStrictDiagnosticsViolated } from './internal/throwIfStrictDiagnosticsViolated.js';
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
    const mergedOptions = mergeFeatherdownOptions(this.defaultOptions, parseOptions);
    const resolvedOptions = resolveFeatherdownOptions(mergedOptions);
    const legacy = pickRenderMarkdownOptions(mergedOptions);

    const fm = parseFrontmatter(markdown, resolvedOptions.frontmatter);
    const metadata = buildMetadataFromFrontmatter(fm.frontmatter);
    const document = await renderMarkdownDocumentInternal(fm.body, legacy, toProcessorGates(resolvedOptions));

    const result = buildFeatherdownResult({
      body: fm.body,
      frontmatter: fm.frontmatter,
      metadata,
      document,
      options: resolvedOptions,
    });
    throwIfStrictDiagnosticsViolated(resolvedOptions, result);
    return result;
  }
}
