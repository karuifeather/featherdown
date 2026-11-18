import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
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
import type { PluggableList, Processor } from 'unified';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { FeatherdownPlugins, RenderMarkdownOptions } from '../types.js';
import type { DiagnosticEmitter } from './diagnostics.js';
import { remarkHeadingIds } from './headingIdsRemark.js';
import rehypeCdnImagesInternal from './rehypeCdnImagesInternal.js';
import rehypeChartBlocksInternal from './rehypeChartBlocksInternal.js';
import rehypeCodeBlockTitles from './rehypeCodeBlockTitles.js';
import rehypeCodeLineHighlights from './rehypeCodeLineHighlights.js';
import rehypeDedupeFootnoteIds from './rehypeDedupeFootnoteIds.js';
import rehypeResolveClobberedHrefs from './rehypeResolveClobberedHrefs.js';
import { remarkCallouts } from './remarkCallouts.js';
import { remarkCodeBlockTitles } from './remarkCodeBlockTitles.js';
import rehypeEmbeds from './rehypeEmbeds.js';
import rehypeImages from './rehypeImages.js';
import rehypeLinks from './rehypeLinks.js';
import remarkDetails from './remarkDetails.js';
import remarkEmbeds from './remarkEmbeds.js';
import remarkGithubAlerts from './remarkGithubAlerts.js';
import { markdownSanitizeSchema, markdownSanitizeSchemaWithEmbeds } from './sanitizeSchema.js';

/** Optional pipeline stages for {@link Featherdown}; omit for legacy all-on behavior. */
export type MarkdownProcessorFeatureGates = {
  math: boolean;
  code: boolean;
  codeHighlighting: boolean;
  charts: boolean;
  sanitize: boolean;
  /** GitHub alerts (`> [!NOTE]`). */
  alerts: boolean;
  /** `:::details` collapsibles. */
  details: boolean;
  /** External link attributes. */
  links: boolean;
  /** Image loading attributes / figures. */
  images: boolean;
  /** Allowlisted iframes and `::embed`. */
  embeds: boolean;
};

/** Returns the Mermaid render (and post-render sanitize) stage for the given gates. */
export type MermaidPluginsFactory = (gates: MarkdownProcessorFeatureGates) => PluggableList;

export type MarkdownProcessor = Processor<MdastRoot, MdastRoot, HastRoot>;

export type InternalProcessorOptions = RenderMarkdownOptions & {
  emitDiagnostic?: DiagnosticEmitter;
  preserveHeadingCustomIdMarker?: boolean;
  features?: MarkdownProcessorFeatureGates;
  /**
   * Plugins that render Mermaid fences (Node-only). Injected by the Node entry
   * so the browser entry never imports `rehype-mermaid` / Playwright.
   */
  mermaidPlugins?: MermaidPluginsFactory;
  /**
   * When true, per-parse state (diagnostics, image manifest) is read from the
   * vfile instead of being captured from these options, so the processor can
   * be cached and shared across parses.
   */
  contextFromFile?: boolean;
  /** User plugins (see {@link FeatherdownPlugins}). */
  plugins?: FeatherdownPlugins;
};

export const ALL_FEATURES_ON: MarkdownProcessorFeatureGates = {
  math: true,
  code: true,
  codeHighlighting: true,
  charts: true,
  sanitize: true,
  // Stages added after the legacy helpers froze their output stay off for them.
  alerts: false,
  details: false,
  links: false,
  images: false,
  embeds: false,
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
 * Build the unified processor shared by every public API.
 *
 * Ordering is security-relevant: author content (Markdown + raw HTML) is
 * sanitized right after raw HTML is parsed, and only then do Featherdown's own
 * plugins add trusted markup (Mermaid SVG, chart mounts, code chrome, KaTeX,
 * heading anchors, highlighting, image rewriting). The Mermaid path sanitizes
 * its SVG output in a second, SVG-aware pass.
 */
export function createMarkdownProcessorInternal(options?: InternalProcessorOptions): MarkdownProcessor {
  const gates = options?.features ?? ALL_FEATURES_ON;
  const contextFromFile = options?.contextFromFile === true;

  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkDirective);

  if (gates.math) {
    processor.use(remarkMath);
  }

  processor.use(remarkHeadingIds);

  // Directive-based stages must run before remarkCallouts, which turns any
  // unrecognized container directive back into plain text.
  if (gates.details) {
    processor.use(remarkDetails);
  }
  if (gates.embeds) {
    processor.use(remarkEmbeds);
  }

  processor.use(remarkCallouts);

  if (gates.alerts) {
    processor.use(remarkGithubAlerts);
  }

  if (gates.code) {
    processor.use(remarkCodeBlockTitles);
  }

  // User remark plugins: their output is author content and is still sanitized.
  if (options?.plugins?.remark?.length) {
    processor.use(options.plugins.remark);
  }

  // With sanitize on, the sanitizer clobber-prefixes ids itself; letting
  // remark-rehype prefix footnote ids too would double them. Hrefs are
  // re-pointed at the prefixed ids by rehypeResolveClobberedHrefs below.
  processor
    .use(remarkRehype, gates.sanitize ? { allowDangerousHtml: true, clobberPrefix: '' } : { allowDangerousHtml: true })
    .use(rehypeRaw);

  if (gates.sanitize) {
    processor.use(rehypeSanitize, gates.embeds ? markdownSanitizeSchemaWithEmbeds : markdownSanitizeSchema);
  }

  // Runs immediately after sanitize: removes non-allowlisted iframes.
  if (gates.embeds) {
    processor.use(rehypeEmbeds);
  }

  // Before rehype-slug / autolink so heading anchors use the deduped id.
  if (gates.sanitize) {
    processor.use(rehypeDedupeFootnoteIds);
  }

  // Code chrome runs before Mermaid so titled / copyable Mermaid fences keep
  // their wrapper when the <pre> is replaced by SVG. It skips chart fences.
  if (gates.code) {
    processor.use(rehypeCodeBlockTitles);
  }

  if (options?.mermaidPlugins) {
    processor.use(options.mermaidPlugins(gates));
  }

  if (gates.charts) {
    if (!contextFromFile && options?.emitDiagnostic) {
      processor.use(rehypeChartBlocksInternal, { emitDiagnostic: options.emitDiagnostic });
    } else {
      processor.use(rehypeChartBlocksInternal);
    }
  }

  if (gates.math) {
    // KaTeX runs after sanitize, so keep its own HTML-extension commands (\href, \htmlStyle, ...) off.
    processor.use(rehypeKatex, { output: 'html', trust: false });
  }

  processor.use(rehypeSlug).use(rehypeAutolinkHeadings, { behavior: 'wrap' });

  if (gates.code && gates.codeHighlighting) {
    processor.use(rehypeHighlight);
  }
  // Line wrappers (highlights, numbers, diff) don't depend on hljs tokens.
  if (gates.code) {
    processor.use(rehypeCodeLineHighlights);
  }

  if (!options?.preserveHeadingCustomIdMarker) {
    processor.use(rehypeStripHeadingCustomIdMarker);
  }

  if (contextFromFile) {
    processor.use(rehypeCdnImagesInternal);
  } else {
    processor.use(rehypeCdnImagesInternal, options);
  }

  if (gates.images) {
    processor.use(rehypeImages);
  }

  if (gates.links) {
    processor.use(rehypeLinks);
  }

  if (gates.sanitize) {
    processor.use(rehypeResolveClobberedHrefs);
  }

  // User rehype plugins run last and are NOT sanitized: trusted code only.
  if (options?.plugins?.rehype?.length) {
    processor.use(options.plugins.rehype);
  }

  processor.use(rehypeStringify);

  return processor as unknown as MarkdownProcessor;
}
