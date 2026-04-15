import { toText } from 'hast-util-to-text';
import { EXIT, visit } from 'unist-util-visit';
import { createMarkdownProcessorInternal } from './createMarkdownProcessorInternal.js';
import { createDiagnosticCollector } from './diagnostics.js';
import type {
  HeadingMetadata,
  RenderMarkdownDocumentResult,
  RenderMarkdownOptions,
  TocItem,
} from '../types.js';
import type { Element, Root as HastRoot } from 'hast';

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

function isCustomHeadingId(value: unknown): boolean {
  return value === true || value === 'true' || value === '';
}

function extractHeadings(root: HastRoot): HeadingMetadata[] {
  const headings: HeadingMetadata[] = [];

  visit(root, 'element', (node) => {
    const depth = getHeadingDepth(node.tagName);
    if (!depth) {
      return;
    }

    const id = typeof node.properties.id === 'string' ? node.properties.id : '';
    if (!id) {
      return;
    }

    const text = normalizeText(toText(node));
    if (!text) {
      return;
    }

    headings.push({
      index: headings.length,
      depth,
      text,
      id,
      hasCustomId: isCustomHeadingId(node.properties.dataHeadingCustomId),
    });
    delete node.properties.dataHeadingCustomId;
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

    if (!isParagraphLikeTagName(node.tagName)) {
      return;
    }

    const text = normalizeText(toText(node));
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

/**
 * Render markdown through the default browser-safe pipeline and derive
 * publishing metadata from the final processed document tree.
 */
export async function renderMarkdownDocumentInternal(
  markdown: string,
  options?: RenderMarkdownOptions,
): Promise<RenderMarkdownDocumentResult> {
  const collector = createDiagnosticCollector();
  const processor = createMarkdownProcessorInternal({
    ...options,
    emitDiagnostic: collector.emit,
    preserveHeadingCustomIdMarker: true,
  });

  const parsed = processor.parse(markdown);
  const root: HastRoot = await processor.run(parsed);

  const headings = extractHeadings(root);
  const html = String(processor.stringify(root));
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
