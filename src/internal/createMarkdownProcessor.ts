import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeChartBlocks from './rehypeChartBlocks.js';
import rehypeCdnImages from './rehypeCdnImages.js';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { remarkHeadingIds } from './headingIdsRemark.js';
import { markdownSanitizeSchema } from './sanitizeSchema.js';

type RenderManifest = {
  map?: Record<string, { url: string }>;
  remote?: Record<string, { url: string }>;
};

type CreateMarkdownProcessorOptions = {
  kind?: string;
  slug?: string;
  manifest?: RenderManifest;
};

export function createMarkdownProcessor(options?: CreateMarkdownProcessorOptions) {
  return (
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkHeadingIds)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeChartBlocks)
      .use(rehypeKatex, { output: 'html' })
      .use(rehypeSanitize, markdownSanitizeSchema)
      .use(rehypeSlug)
      .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
      .use(rehypeHighlight)
      .use(rehypeCdnImages, options)
      .use(rehypeStringify)
  );
}
