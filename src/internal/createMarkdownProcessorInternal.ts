import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeChartBlocksInternal from './rehypeChartBlocksInternal.js';
import rehypeCdnImagesInternal from './rehypeCdnImagesInternal.js';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import type { RenderMarkdownOptions } from '../types.js';
import { remarkHeadingIds } from './headingIdsRemark.js';
import type { DiagnosticEmitter } from './diagnostics.js';
import { markdownSanitizeSchema } from './sanitizeSchema.js';

type InternalOptions = RenderMarkdownOptions & {
  emitDiagnostic?: DiagnosticEmitter;
};

export function createMarkdownProcessorInternal(
  options?: InternalOptions,
) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkHeadingIds)
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

