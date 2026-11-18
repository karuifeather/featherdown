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
import { setPipelineContext } from './pipelineContext.js';
import type {
  HeadingMetadata,
  RenderMarkdownDocumentResult,
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

const processorCache = new Map<string, MarkdownProcessor>();

function cacheKey(gates: MarkdownProcessorFeatureGates, mermaid: boolean): string {
  return [
    mermaid,
    gates.math,
    gates.code,
    gates.codeHighlighting,
    gates.charts,
    gates.sanitize,
  ]
    .map((flag) => (flag ? '1' : '0'))
    .join('');
}

/**
 * Return a frozen processor for these gates, building it once. Processors hold
 * no per-parse state (diagnostics and image options travel on the vfile), so a
 * cached instance is safe to share across sequential and concurrent parses.
 */
function getCachedProcessor(
  gates: MarkdownProcessorFeatureGates,
  mermaidPlugins: MermaidPluginsFactory | undefined,
): MarkdownProcessor {
  const key = cacheKey(gates, mermaidPlugins !== undefined);
  let processor = processorCache.get(key);
  if (!processor) {
    processor = createMarkdownProcessorInternal({
      features: gates,
      preserveHeadingCustomIdMarker: true,
      contextFromFile: true,
      ...(mermaidPlugins ? { mermaidPlugins } : {}),
    }).freeze();
    processorCache.set(key, processor);
  }
  return processor;
}

export type RenderDocumentPipelineOptions = {
  /** Node-only Mermaid stage; omit for the browser-safe pipeline. */
  mermaidPlugins?: MermaidPluginsFactory;
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
  const collector = createDiagnosticCollector();
  const processor = getCachedProcessor(pipelineFeatures ?? ALL_FEATURES_ON, pipeline?.mermaidPlugins);

  const file = new VFile(markdown);
  setPipelineContext(file, { ...options, emitDiagnostic: collector.emit });

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
  };
}
