import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import { defListHastHandlers, remarkDefinitionList } from 'remark-definition-list';
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
import rehypeKatexConfigured from './rehypeKatexConfigured.js';
import rehypeResolveClobberedHrefs from './rehypeResolveClobberedHrefs.js';
import rehypeTabs from './rehypeTabs.js';
import { remarkCallouts } from './remarkCallouts.js';
import { remarkCodeBlockTitles } from './remarkCodeBlockTitles.js';
import rehypeEmbeds from './rehypeEmbeds.js';
import rehypeImages from './rehypeImages.js';
import rehypeLinks from './rehypeLinks.js';
import remarkDetails from './remarkDetails.js';
import remarkEmbeds from './remarkEmbeds.js';
import remarkGithubAlerts from './remarkGithubAlerts.js';
import remarkRestoreTextDirectives from './remarkRestoreTextDirectives.js';
import remarkSubSuperscript from './remarkSubSuperscript.js';
import remarkTabs from './remarkTabs.js';
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
  /** `H~2~O` / `x^2^`. */
  subSuperscript: boolean;
  /** `Term` / `: Definition` lists. */
  definitionLists: boolean;
  /** `::::tabs` / `:::tab[Label]`. */
  tabs: boolean;
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
  subSuperscript: false,
  definitionLists: false,
  tabs: false,
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

  // `~x~` is subscript when that stage is on, so GFM keeps only `~~x~~` as strikethrough.
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm, gates.subSuperscript ? { singleTilde: false } : {})
    .use(remarkDirective);

  if (gates.definitionLists) {
    processor.use(remarkDefinitionList);
  }

  if (gates.math) {
    processor.use(remarkMath);
  }

  processor.use(remarkHeadingIds);

  // No inline directives are defined; keep `10:30` and `:smile:` as the text they were.
  processor.use(remarkRestoreTextDirectives);

  // Directive-based stages must run before remarkCallouts, which turns any
  // unrecognized container directive back into plain text.
  if (gates.details) {
    processor.use(remarkDetails);
  }
  if (gates.embeds) {
    processor.use(remarkEmbeds);
  }
  if (gates.tabs) {
    processor.use(remarkTabs);
  }

  processor.use(remarkCallouts);

  if (gates.alerts) {
    processor.use(remarkGithubAlerts);
  }

  if (gates.subSuperscript) {
    processor.use(remarkSubSuperscript);
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
    .use(remarkRehype, {
      allowDangerousHtml: true,
      ...(gates.sanitize ? { clobberPrefix: '' } : {}),
      ...(gates.definitionLists ? { handlers: defListHastHandlers } : {}),
    })
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
    // KaTeX runs after sanitize, so its HTML-extension commands (\href, \htmlStyle, ...) stay
    // off unless `math.trust` is set. Options are read per parse (see rehypeKatexConfigured).
    processor.use(rehypeKatexConfigured);
  }

  processor.use(rehypeSlug).use(rehypeAutolinkHeadings, { behavior: 'wrap' });

  // After sanitize (buttons and generated ids are trusted output, not author input) and after
  // rehype-slug, so generated tab ids can avoid every id already in the document.
  if (gates.tabs) {
    processor.use(rehypeTabs);
  }

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
