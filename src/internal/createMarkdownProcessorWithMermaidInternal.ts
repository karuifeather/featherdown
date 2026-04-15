import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeMermaid from 'rehype-mermaid';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import type { RenderMarkdownOptions } from '../types.js';
import rehypeChartBlocksInternal from './rehypeChartBlocksInternal.js';
import rehypeCdnImagesInternal from './rehypeCdnImagesInternal.js';
import { remarkHeadingIds } from './headingIdsRemark.js';
import { schemaWithSvg } from './sanitizeSchema.js';

export function createMarkdownProcessorWithMermaidInternal(
  options?: RenderMarkdownOptions,
) {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkHeadingIds)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeChartBlocksInternal)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
    .use(rehypeKatex, { output: 'html' })
    .use(rehypeHighlight)
    .use(rehypeMermaid, { strategy: 'inline-svg' })
    .use(rehypeSanitize, schemaWithSvg)
    .use(rehypeCdnImagesInternal, options)
    .use(rehypeStringify);
}

