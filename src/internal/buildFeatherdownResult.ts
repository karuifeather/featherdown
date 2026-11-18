import type {
  FeatherdownMetadata,
  FeatherdownResult,
  RenderMarkdownDocumentResult,
  TocItem,
  TocTreeItem,
} from '../types.js';
import type { DetectedFeatures } from './renderMarkdownDocumentInternal.js';
import type { ResolvedFeatherdownOptions } from './resolveFeatherdownOptions.js';

const NOTHING_DETECTED: DetectedFeatures = {
  math: false,
  code: false,
  charts: false,
  embeds: false,
  mermaid: false,
};

/** A feature is reported only when its option is on AND it was actually rendered. */
function effectiveFeatures(
  resolved: ResolvedFeatherdownOptions,
  detected: DetectedFeatures,
  mermaidFeature: boolean,
): FeatherdownResult['assets']['features'] {
  return {
    math: resolved.math.enabled && detected.math,
    code: resolved.code.enabled && detected.code,
    charts: resolved.charts && detected.charts,
    mermaid: mermaidFeature && detected.mermaid,
    embeds: resolved.embeds.enabled && detected.embeds,
  };
}

function buildAssets(
  resolved: ResolvedFeatherdownOptions,
  detected: DetectedFeatures,
  mermaidFeature: boolean,
): FeatherdownResult['assets'] {
  const features = effectiveFeatures(resolved, detected, mermaidFeature);
  const styles: string[] = ['featherdown/styles/base.css'];
  if (features.math) {
    styles.push('featherdown/styles/katex.css');
  }
  if (features.code) {
    styles.push('featherdown/styles/code.css');
    if (resolved.code.highlighting) {
      styles.push('featherdown/styles/highlight.css');
    }
  }
  return { styles, scripts: [], features };
}

/**
 * Nests a flat TOC under the nearest shallower preceding heading. Skipped
 * levels nest normally (h2 then h4 puts the h4 under the h2); items with no
 * shallower predecessor (e.g. a document starting at h3) become roots.
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
 * Keeps TOC items within `[minDepth, maxDepth]`. If `minDepth > maxDepth` the
 * bounds are swapped (so `{ minDepth: 4, maxDepth: 2 }` behaves like 2..4).
 */
export function filterTocByDepth(toc: TocItem[], minDepth: number, maxDepth: number): TocItem[] {
  const lo = Math.min(minDepth, maxDepth);
  const hi = Math.max(minDepth, maxDepth);
  return toc.filter((item) => item.depth >= lo && item.depth <= hi);
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
  /** Features found in the rendered HAST; omitted means none were detected. */
  detected?: DetectedFeatures;
}): FeatherdownResult {
  const { body, frontmatter, metadata, document: doc, options: resolved, mermaidFeature, detected } = args;
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
  } else {
    toc = filterTocByDepth(toc, resolved.headings.minDepth, resolved.headings.maxDepth);
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
    assets: buildAssets(resolved, detected ?? NOTHING_DETECTED, mermaidEnabled),
  };
}
