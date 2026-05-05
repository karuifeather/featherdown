import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeCodeBlockTitles from './rehypeCodeBlockTitles.js';
import rehypeCodeLineHighlights from './rehypeCodeLineHighlights.js';
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
import { visit } from 'unist-util-visit';
import type { Root as MdastRoot } from 'mdast';
import type { Processor } from 'unified';
import { unified } from 'unified';
import type { RenderMarkdownOptions } from '../types.js';
import { remarkHeadingIds } from './headingIdsRemark.js';
import { remarkCallouts } from './remarkCallouts.js';
import { remarkCodeBlockTitles } from './remarkCodeBlockTitles.js';
import type { DiagnosticEmitter } from './diagnostics.js';
import { markdownSanitizeSchema } from './sanitizeSchema.js';

/** Optional pipeline stages for {@link Featherdown}; omit for legacy all-on behavior. */
export type MarkdownProcessorFeatureGates = {
  math: boolean;
  code: boolean;
  codeHighlighting: boolean;
  charts: boolean;
  sanitize: boolean;
};

type InternalOptions = RenderMarkdownOptions & {
  emitDiagnostic?: DiagnosticEmitter;
  preserveHeadingCustomIdMarker?: boolean;
  features?: MarkdownProcessorFeatureGates;
};

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
 * Build the default browser-safe unified processor used by public APIs.
 *
 * Internal helper that wires remark/rehype plugins for math, highlighting,
 * sanitization, heading ids, chart placeholders, and image rewriting.
 */
export function createMarkdownProcessorInternal(
  options?: InternalOptions,
): Processor<MdastRoot, MdastRoot, HastRoot> {
  const gates: MarkdownProcessorFeatureGates = options?.features ?? {
    math: true,
    code: true,
    codeHighlighting: true,
    charts: true,
    sanitize: true,
  };

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

  if (gates.code) {
    processor.use(rehypeCodeBlockTitles);
  }

  if (gates.math) {
    processor.use(rehypeKatex, { output: 'html' });
  }

  if (gates.sanitize) {
    processor.use(rehypeSanitize, markdownSanitizeSchema);
  }

  processor.use(rehypeSlug).use(rehypeAutolinkHeadings, { behavior: 'wrap' });

  if (gates.code && gates.codeHighlighting) {
    processor.use(rehypeHighlight).use(rehypeCodeLineHighlights);
  }

  if (!options?.preserveHeadingCustomIdMarker) {
    processor.use(rehypeStripHeadingCustomIdMarker);
  }

  processor.use(rehypeCdnImagesInternal, options).use(rehypeStringify);

  return processor as unknown as Processor<MdastRoot, MdastRoot, HastRoot>;
}
