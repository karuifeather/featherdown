import { readFile } from 'node:fs/promises';
import { buildFeatherdownResult } from './internal/buildFeatherdownResult.js';
import { buildMetadataFromFrontmatter } from './internal/buildMetadataFromFrontmatter.js';
import { pickRenderMarkdownOptions, toProcessorGates } from './internal/featherdownParseHelpers.js';
import { parseFrontmatter } from './internal/parseFrontmatter.js';
import { renderMarkdownDocumentWithMermaidInternal } from './internal/renderMarkdownDocumentWithMermaidInternal.js';
import {
  mergeFeatherdownOptions,
  resolveFeatherdownOptions,
} from './internal/resolveFeatherdownOptions.js';
import { throwIfStrictDiagnosticsViolated } from './internal/throwIfStrictDiagnosticsViolated.js';
import { Featherdown as BaseFeatherdown } from './featherdown.js';
import type { NodeFeatherdownOptions, NodeFeatherdownParseOptions } from './nodeTypes.js';
import type { FeatherdownOptions, FeatherdownResult } from './types.js';

function stripMermaidForBase(options?: NodeFeatherdownOptions): FeatherdownOptions | undefined {
  if (!options) {
    return undefined;
  }
  const rest = { ...options };
  delete rest.mermaid;
  return Object.keys(rest).length > 0 ? (rest as FeatherdownOptions) : undefined;
}

function mergeNodeFeatherdownOptions(
  ctor?: NodeFeatherdownOptions,
  parse?: NodeFeatherdownParseOptions,
): NodeFeatherdownOptions | undefined {
  const baseMerged = mergeFeatherdownOptions(stripMermaidForBase(ctor), stripMermaidForBase(parse));
  const mermaid =
    parse?.mermaid !== undefined ? parse.mermaid : ctor?.mermaid !== undefined ? ctor.mermaid : undefined;
  if (mermaid === undefined) {
    return baseMerged as NodeFeatherdownOptions | undefined;
  }
  return { ...(baseMerged ?? {}), mermaid };
}

function isMermaidSvgEnabled(merged?: NodeFeatherdownOptions): boolean {
  return merged?.mermaid !== undefined && merged.mermaid !== false;
}

/**
 * Node {@link Featherdown}: same {@link Featherdown.parse} behavior as the browser
 * entry when Mermaid SVG is off; delegates to the base class. With `mermaid: { render: "svg" }`,
 * uses the inline-SVG Mermaid pipeline and sets {@link FeatherdownResult.assets.features.mermaid}.
 */
export class Featherdown {
  private readonly base: BaseFeatherdown;
  private readonly ctorOptions: NodeFeatherdownOptions | undefined;

  constructor(options?: NodeFeatherdownOptions) {
    this.base = new BaseFeatherdown(stripMermaidForBase(options));
    this.ctorOptions = options;
  }

  async parse(markdown: string, parseOptions?: NodeFeatherdownParseOptions): Promise<FeatherdownResult> {
    const mergedNode = mergeNodeFeatherdownOptions(this.ctorOptions, parseOptions);
    if (!isMermaidSvgEnabled(mergedNode)) {
      return this.base.parse(markdown, stripMermaidForBase(mergedNode));
    }

    const mergedOptions = mergeFeatherdownOptions(stripMermaidForBase(this.ctorOptions), stripMermaidForBase(parseOptions));
    const resolvedOptions = resolveFeatherdownOptions(mergedOptions);
    const legacy = pickRenderMarkdownOptions(mergedOptions);

    const fm = parseFrontmatter(markdown, resolvedOptions.frontmatter);
    const metadata = buildMetadataFromFrontmatter(fm.frontmatter);
    const document = await renderMarkdownDocumentWithMermaidInternal(
      fm.body,
      legacy,
      toProcessorGates(resolvedOptions),
    );

    const result = buildFeatherdownResult({
      body: fm.body,
      frontmatter: fm.frontmatter,
      metadata,
      document,
      options: resolvedOptions,
      mermaidFeature: true,
    });
    throwIfStrictDiagnosticsViolated(resolvedOptions, result);
    return result;
  }

  async parseFile(path: string, parseOptions?: NodeFeatherdownParseOptions): Promise<FeatherdownResult> {
    const markdown = await readFile(path, 'utf8');
    return this.parse(markdown, parseOptions);
  }
}
