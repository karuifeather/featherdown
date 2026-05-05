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
import type { Element, Root as HastRoot } from 'hast';
import type { Root as MdastRoot } from 'mdast';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import type { Processor } from 'unified';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { RenderMarkdownOptions } from '../types.js';
import rehypeChartBlocksInternal from './rehypeChartBlocksInternal.js';
import rehypeCdnImagesInternal from './rehypeCdnImagesInternal.js';
import { remarkHeadingIds } from './headingIdsRemark.js';
import { remarkCallouts } from './remarkCallouts.js';
import { remarkCodeBlockTitles } from './remarkCodeBlockTitles.js';
import type { MarkdownProcessorFeatureGates } from './createMarkdownProcessorInternal.js';
import type { DiagnosticEmitter } from './diagnostics.js';
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

type InternalOptions = RenderMarkdownOptions & {
  emitDiagnostic?: DiagnosticEmitter;
  preserveHeadingCustomIdMarker?: boolean;
  features?: MarkdownProcessorFeatureGates;
};

/**
 * Build the Node-focused unified processor that includes Mermaid rendering.
 *
 * Remark/rehype stages align with {@link createMarkdownProcessorInternal} intent
 * (GFM, directives, callouts, gated math/code/charts/sanitize). Rehype ordering
 * keeps the prior Mermaid-capable sequence so existing Node Mermaid snapshots stay stable.
 */
export function createMarkdownProcessorWithMermaidInternal(options?: InternalOptions) {
  const gates: MarkdownProcessorFeatureGates = options?.features ?? {
    math: true,
    code: true,
    codeHighlighting: true,
    charts: true,
    sanitize: true,
  };

  const fallbackToOriginalCodeBlock = (element: Element): Element => element;

  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkDirective);

  if (gates.math) {
    processor.use(remarkMath);
  }

  processor.use(remarkHeadingIds).use(remarkCallouts);

  if (gates.code) {
    processor.use(remarkCodeBlockTitles);
  }

  processor.use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw);

  if (gates.charts) {
    if (options?.emitDiagnostic) {
      processor.use(rehypeChartBlocksInternal, { emitDiagnostic: options.emitDiagnostic });
    } else {
      processor.use(rehypeChartBlocksInternal);
    }
  }

  processor.use(rehypeSlug).use(rehypeAutolinkHeadings, { behavior: 'wrap' });

  if (gates.code) {
    processor.use(rehypeCodeBlockTitles);
  }

  if (gates.math) {
    processor.use(rehypeKatex, { output: 'html' });
  }

  if (gates.code && gates.codeHighlighting) {
    processor.use(rehypeHighlight);
  }

  processor.use(rehypeMermaid, {
    strategy: 'inline-svg',
    errorFallback: fallbackToOriginalCodeBlock,
  });

  if (gates.sanitize) {
    processor.use(rehypeSanitize, schemaWithSvg);
  }

  if (gates.code && gates.codeHighlighting) {
    processor.use(rehypeCodeLineHighlights);
  }

  if (!options?.preserveHeadingCustomIdMarker) {
    processor.use(rehypeStripHeadingCustomIdMarker);
  }

  processor.use(rehypeCdnImagesInternal, options).use(rehypeStringify);

  return processor as unknown as Processor<MdastRoot, MdastRoot, HastRoot>;
}
