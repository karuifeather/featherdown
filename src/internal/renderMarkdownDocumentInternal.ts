import { toText } from 'hast-util-to-text';
import { EXIT, SKIP, visit } from 'unist-util-visit';
import { VFile } from 'vfile';
import {
  ALL_FEATURES_ON,
  createMarkdownProcessorInternal,
  type MarkdownProcessor,
  type MarkdownProcessorFeatureGates,
  type MermaidPluginsFactory,
} from './createMarkdownProcessorInternal.js';
import { createDiagnosticCollector } from './diagnostics.js';
import { setPipelineContext, type PipelineFeatureConfig } from './pipelineContext.js';
import type {
  HeadingMetadata,
  RenderMarkdownDocumentResult,
  FeatherdownPlugins,
  RenderMarkdownOptions,
  TocItem,
} from '../types.js';
import type { Element, ElementContent, Root as HastRoot } from 'hast';

const WORDS_PER_MINUTE = 200;

type ParagraphLikeTagName = 'p' | 'blockquote' | 'li';

const excerptTagNames: ReadonlySet<ParagraphLikeTagName> = new Set(['p', 'blockquote', 'li']);

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function getHeadingDepth(tagName: string): number | null {
  const match = /^h([1-6])$/.exec(tagName);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

function isParagraphLikeTagName(tagName: string): tagName is ParagraphLikeTagName {
  return excerptTagNames.has(tagName as ParagraphLikeTagName);
}

/** GFM footnotes render into `<section data-footnotes>`; it is not article content for TOC/excerpt. */
function isFootnotesSection(node: Element): boolean {
  return node.tagName === 'section' && node.properties.dataFootnotes !== undefined;
}

/** Plain text of a node, ignoring footnote reference markers (`<a data-footnote-ref>`). */
function excerptText(node: Element): string {
  const parts: string[] = [];
  const walk = (child: ElementContent): void => {
    if (child.type === 'text') {
      parts.push(child.value);
    } else if (child.type === 'element') {
      if (child.properties.dataFootnoteRef !== undefined) return;
      if (child.tagName === 'br') {
        parts.push(' ');
        return;
      }
      child.children.forEach(walk);
    }
  };
  node.children.forEach(walk);
  return normalizeText(parts.join(''))
    // Drop the gap left by removed inline content before punctuation ("and ." -> "and.").
    .replace(/\s+([.,;:!?)])/g, '$1')
    .replace(/\(\s+/g, '(');
}

function isCustomHeadingId(value: unknown): boolean {
  return value === true || value === 'true' || value === '';
}

function extractHeadings(root: HastRoot): HeadingMetadata[] {
  const headings: HeadingMetadata[] = [];

  visit(root, 'element', (node) => {
    if (isFootnotesSection(node)) {
      return SKIP;
    }
    const depth = getHeadingDepth(node.tagName);
    if (!depth) {
      return undefined;
    }

    const id = typeof node.properties.id === 'string' ? node.properties.id : '';
    if (!id) {
      return undefined;
    }

    const text = normalizeText(toText(node));
    if (!text) {
      return undefined;
    }

    headings.push({
      index: headings.length,
      depth,
      text,
      id,
      hasCustomId: isCustomHeadingId(node.properties.dataHeadingCustomId),
    });
    delete node.properties.dataHeadingCustomId;
    return undefined;
  });

  return headings;
}

function extractToc(headings: HeadingMetadata[]): TocItem[] {
  return headings.map((heading) => ({
    depth: heading.depth,
    text: heading.text,
    id: heading.id,
  }));
}

function extractExcerpt(root: HastRoot): string | null {
  let excerpt: string | null = null;

  visit(root, 'element', (node: Element) => {
    if (excerpt !== null) {
      return EXIT;
    }

    if (isFootnotesSection(node)) {
      return SKIP;
    }

    if (!isParagraphLikeTagName(node.tagName)) {
      return;
    }

    const text = excerptText(node);
    if (!text) {
      return;
    }

    excerpt = text;
    return EXIT;
  });

  return excerpt;
}

function countWords(root: HastRoot): number {
  const text = normalizeText(toText(root));
  if (!text) {
    return 0;
  }
  const words = text.match(/\S+/g);
  return words ? words.length : 0;
}

function estimateReadingMinutes(wordCount: number): number {
  if (wordCount <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

/** Features actually present in the rendered HAST (internal; never on public results). */
export type DetectedFeatures = {
  math: boolean;
  code: boolean;
  charts: boolean;
  embeds: boolean;
  mermaid: boolean;
};

function classNames(node: Element): string[] {
  const value = node.properties.className;
  if (Array.isArray(value)) return value.map(String);
  return typeof value === 'string' ? value.split(/\s+/) : [];
}

/** Scans the final HAST for rendered KaTeX, code blocks, chart mounts, iframes and Mermaid SVG. */
export function detectFeatures(root: HastRoot): DetectedFeatures {
  const found: DetectedFeatures = { math: false, code: false, charts: false, embeds: false, mermaid: false };
  visit(root, 'element', (node) => {
    const classes = classNames(node);
    if (classes.includes('katex') || classes.includes('katex-display')) {
      found.math = true;
    }
    if (classes.includes('chart-mount')) {
      found.charts = true;
    }
    if (node.tagName === 'pre' && node.children.some((c) => c.type === 'element' && c.tagName === 'code')) {
      found.code = true;
    }
    if (node.tagName === 'iframe') {
      found.embeds = true;
    }
    if (node.tagName === 'svg') {
      const id = typeof node.properties.id === 'string' ? node.properties.id : '';
      if (/^(user-content-)?mermaid/.test(id)) {
        found.mermaid = true;
      }
    }
    return undefined;
  });
  return found;
}

const processorCache = new Map<string, MarkdownProcessor>();
/** Processors for instances with user plugins, keyed by the plugins object. */
const pluginProcessorCache = new WeakMap<FeatherdownPlugins, Map<string, MarkdownProcessor>>();

function cacheKey(gates: MarkdownProcessorFeatureGates, mermaid: boolean): string {
  return [
    mermaid,
    gates.math,
    gates.code,
    gates.codeHighlighting,
    gates.charts,
    gates.sanitize,
    gates.alerts,
    gates.details,
    gates.links,
    gates.images,
    gates.embeds,
  ]
    .map((flag) => (flag ? '1' : '0'))
    .join('');
}

/**
 * Return a frozen processor for these gates, building it once. Processors hold
 * no per-parse state (diagnostics and image options travel on the vfile), so a
 * cached instance is safe to share across sequential and concurrent parses.
 * With user plugins the cache is keyed by the plugins object identity.
 */
function getCachedProcessor(
  gates: MarkdownProcessorFeatureGates,
  mermaidPlugins: MermaidPluginsFactory | undefined,
  plugins: FeatherdownPlugins | undefined,
): MarkdownProcessor {
  const key = cacheKey(gates, mermaidPlugins !== undefined);
  const hasPlugins = Boolean(plugins?.remark?.length || plugins?.rehype?.length);
  let cache = processorCache;
  if (plugins && hasPlugins) {
    let perPlugins = pluginProcessorCache.get(plugins);
    if (!perPlugins) {
      perPlugins = new Map();
      pluginProcessorCache.set(plugins, perPlugins);
    }
    cache = perPlugins;
  }
  let processor = cache.get(key);
  if (!processor) {
    processor = createMarkdownProcessorInternal({
      features: gates,
      preserveHeadingCustomIdMarker: true,
      contextFromFile: true,
      ...(mermaidPlugins ? { mermaidPlugins } : {}),
      ...(plugins && hasPlugins ? { plugins } : {}),
    }).freeze();
    cache.set(key, processor);
  }
  return processor;
}

export type RenderDocumentPipelineOptions = {
  /** Node-only Mermaid stage; omit for the browser-safe pipeline. */
  mermaidPlugins?: MermaidPluginsFactory;
  /** Per-parse feature configuration read by plugins from the vfile. */
  config?: PipelineFeatureConfig;
  /** User remark / rehype plugins. */
  plugins?: FeatherdownPlugins;
};

/**
 * Render markdown and derive publishing metadata from the final processed
 * document tree. Uses the browser-safe pipeline unless `mermaidPlugins` is set.
 */
export async function renderMarkdownDocumentInternal(
  markdown: string,
  options?: RenderMarkdownOptions,
  pipelineFeatures?: MarkdownProcessorFeatureGates,
  pipeline?: RenderDocumentPipelineOptions,
): Promise<RenderMarkdownDocumentResult> {
  const detailed = await renderMarkdownDocumentDetailed(markdown, options, pipelineFeatures, pipeline);
  // Rebuild explicitly so internal-only fields never leak into legacy results.
  return {
    html: detailed.html,
    diagnostics: detailed.diagnostics,
    toc: detailed.toc,
    headings: detailed.headings,
    excerpt: detailed.excerpt,
    wordCount: detailed.wordCount,
    estimatedReadingMinutes: detailed.estimatedReadingMinutes,
  };
}

/**
 * Same as {@link renderMarkdownDocumentInternal} but also reports which
 * features were actually rendered. Used by `Featherdown.parse()` only, so the
 * legacy result shape is unchanged.
 */
export async function renderMarkdownDocumentDetailed(
  markdown: string,
  options?: RenderMarkdownOptions,
  pipelineFeatures?: MarkdownProcessorFeatureGates,
  pipeline?: RenderDocumentPipelineOptions,
): Promise<RenderMarkdownDocumentResult & { detected: DetectedFeatures }> {
  const collector = createDiagnosticCollector();
  const processor = getCachedProcessor(
    pipelineFeatures ?? ALL_FEATURES_ON,
    pipeline?.mermaidPlugins,
    pipeline?.plugins,
  );

  const file = new VFile(markdown);
  setPipelineContext(file, {
    ...options,
    emitDiagnostic: collector.emit,
    ...(pipeline?.config ? { config: pipeline.config } : {}),
  });

  const parsed = processor.parse(file);
  const root: HastRoot = await processor.run(parsed, file);

  const headings = extractHeadings(root);
  const html = String(processor.stringify(root, file));
  const wordCount = countWords(root);

  return {
    html,
    diagnostics: collector.diagnostics,
    toc: extractToc(headings),
    headings,
    excerpt: extractExcerpt(root),
    wordCount,
    estimatedReadingMinutes: estimateReadingMinutes(wordCount),
    detected: detectFeatures(root),
  };
}
