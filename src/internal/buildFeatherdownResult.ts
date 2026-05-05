import type { FeatherdownMetadata, FeatherdownResult, RenderMarkdownDocumentResult } from '../types.js';
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
    },
  };
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
    stats: {
      wordCount,
      readingTimeMinutes: estimatedReadingMinutes,
    },
    assets: buildAssets(resolved, mermaidEnabled),
  };
}
