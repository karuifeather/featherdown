import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeChartBlocksInternal from './rehypeChartBlocksInternal.js';
import rehypeCdnImagesInternal from './rehypeCdnImagesInternal.js';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import type { Root as HastRoot } from 'hast';
import type { Root as MdastRoot } from 'mdast';
import type { Processor } from 'unified';
import { unified } from 'unified';
import type { RenderMarkdownOptions } from '../types.js';
import { remarkHeadingIds } from './headingIdsRemark.js';
import { remarkCallouts } from './remarkCallouts.js';
import type { DiagnosticEmitter } from './diagnostics.js';
import { markdownSanitizeSchema } from './sanitizeSchema.js';

type InternalOptions = RenderMarkdownOptions & {
  emitDiagnostic?: DiagnosticEmitter;
};

/**
 * Build the default browser-safe unified processor used by public APIs.
 *
 * Internal helper that wires remark/rehype plugins for math, highlighting,
 * sanitization, heading ids, chart placeholders, and image rewriting.
 */
export function createMarkdownProcessorInternal(
  options?: InternalOptions,
): Processor<MdastRoot, MdastRoot, HastRoot> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkMath)
    .use(remarkHeadingIds)
    .use(remarkCallouts)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw);

  if (options?.emitDiagnostic) {
    processor.use(rehypeChartBlocksInternal, { emitDiagnostic: options.emitDiagnostic });
  } else {
    processor.use(rehypeChartBlocksInternal);
  }

  processor
    .use(rehypeKatex, { output: 'html' })
    .use(rehypeSanitize, markdownSanitizeSchema)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
    .use(rehypeHighlight)
    .use(rehypeCdnImagesInternal, options)
    .use(rehypeStringify);

  return processor;
}

