import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeMermaid from 'rehype-mermaid';
import rehypeCodeBlockTitles from './rehypeCodeBlockTitles.js';
import rehypeCodeLineHighlights from './rehypeCodeLineHighlights.js';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import type { Root as HastRoot } from 'hast';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { RenderMarkdownOptions } from '../types.js';
import rehypeChartBlocksInternal from './rehypeChartBlocksInternal.js';
import rehypeCdnImagesInternal from './rehypeCdnImagesInternal.js';
import { remarkHeadingIds } from './headingIdsRemark.js';
import { remarkCodeBlockTitles } from './remarkCodeBlockTitles.js';
import { schemaWithSvg } from './sanitizeSchema.js';

function rehypeStripHeadingCustomIdMarker() {
  return (tree: HastRoot): undefined => {
    visit(tree, 'element', (node) => {
      if (!/^h[1-6]$/.test(node.tagName)) {
        return;
      }
      delete node.properties.dataHeadingCustomId;
    });
  };
}

/**
 * Build the Node-focused unified processor that includes Mermaid rendering.
 *
 * Internal helper for the `node` subpath; enables inline SVG Mermaid output
 * with a sanitizer schema that permits the required SVG elements.
 */
export function createMarkdownProcessorWithMermaidInternal(
  options?: RenderMarkdownOptions,
) {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkHeadingIds)
    .use(remarkCodeBlockTitles)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeChartBlocksInternal)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
    .use(rehypeCodeBlockTitles)
    .use(rehypeKatex, { output: 'html' })
    .use(rehypeHighlight)
    .use(rehypeMermaid, { strategy: 'inline-svg' })
    .use(rehypeSanitize, schemaWithSvg)
    .use(rehypeCodeLineHighlights)
    .use(rehypeStripHeadingCustomIdMarker)
    .use(rehypeCdnImagesInternal, options)
    .use(rehypeStringify);
}

