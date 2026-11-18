import type {
  FeatherdownMetadata,
  FeatherdownResult,
  RenderMarkdownDocumentResult,
  TocItem,
  TocTreeItem,
} from '../types.js';
import type { ResolvedFeatherdownOptions } from './resolveFeatherdownOptions.js';

function buildStyleAssets(resolved: ResolvedFeatherdownOptions): string[] {
  const styles: string[] = ['featherdown/styles/base.css'];
  if (resolved.math.enabled) {
    styles.push('featherdown/styles/katex.css');
  }
  if (resolved.code.enabled) {
    styles.push('featherdown/styles/code.css');
    if (resolved.code.highlighting) {
      styles.push('featherdown/styles/highlight.css');
    }
  }
  return styles;
}

function buildAssets(
  resolved: ResolvedFeatherdownOptions,
  mermaidFeature: boolean,
): FeatherdownResult['assets'] {
  return {
    styles: buildStyleAssets(resolved),
    scripts: [],
    features: {
      math: resolved.math.enabled,
      code: resolved.code.enabled,
      charts: resolved.charts,
      mermaid: mermaidFeature,
      embeds: resolved.embeds.enabled,
    },
  };
}

/**
 * SCAFFOLD: nests a flat TOC under the nearest shallower heading. The
 * headings/metadata work owns depth filtering and edge cases.
 */
export function buildTocTree(toc: TocItem[]): TocTreeItem[] {
  const roots: TocTreeItem[] = [];
  const stack: TocTreeItem[] = [];
  for (const item of toc) {
    const node: TocTreeItem = { ...item, children: [] };
    while (stack.length > 0 && (stack[stack.length - 1]?.depth ?? 0) >= node.depth) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
    stack.push(node);
  }
  return roots;
}

/**
 * Assembles the public {@link FeatherdownResult} from a rendered document and
 * resolved options: diagnostics visibility, heading metadata, publishing
 * fields, stats mirroring, body/front matter/metadata, and asset hints.
 */
export function buildFeatherdownResult(args: {
  body: string;
  frontmatter: Record<string, unknown>;
  metadata: FeatherdownMetadata;
  document: RenderMarkdownDocumentResult;
  options: ResolvedFeatherdownOptions;
  /** When true, {@link FeatherdownResult.assets.features.mermaid} is set for the Node SVG pipeline. */
  mermaidFeature?: boolean;
}): FeatherdownResult {
  const { body, frontmatter, metadata, document: doc, options: resolved, mermaidFeature } = args;
  const mermaidEnabled = mermaidFeature === true;

  let diagnostics = doc.diagnostics;
  if (!resolved.diagnostics.enabled) {
    diagnostics = [];
  }

  let toc = doc.toc;
  let headings = doc.headings;
  if (!resolved.headings.enabled) {
    toc = [];
    headings = [];
  } else if (!resolved.headings.toc) {
    toc = [];
  }

  let excerpt = doc.excerpt;
  let wordCount = doc.wordCount;
  let estimatedReadingMinutes = doc.estimatedReadingMinutes;

  if (!resolved.publishing.excerpt) {
    excerpt = null;
  }
  if (!resolved.publishing.wordCount) {
    wordCount = 0;
  }
  if (!resolved.publishing.readingTime) {
    estimatedReadingMinutes = 0;
  }

  return {
    html: doc.html,
    diagnostics,
    toc,
    headings,
    excerpt,
    wordCount,
    estimatedReadingMinutes,
    body,
    frontmatter,
    metadata,
    tocTree: buildTocTree(toc),
    stats: {
      wordCount,
      readingTimeMinutes: estimatedReadingMinutes,
    },
    assets: buildAssets(resolved, mermaidEnabled),
  };
}
