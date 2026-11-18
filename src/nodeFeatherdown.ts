import { readFile } from 'node:fs/promises';
import { mermaidPlugins } from './internal/mermaidPlugins.js';
import { mergeFeatherdownOptions } from './internal/resolveFeatherdownOptions.js';
import { runFeatherdownParse } from './internal/runFeatherdownParse.js';
import type { NodeFeatherdownOptions, NodeFeatherdownParseOptions } from './nodeTypes.js';
import type { FeatherdownOptions, FeatherdownResult } from './types.js';

function stripMermaid(options?: NodeFeatherdownOptions): FeatherdownOptions | undefined {
  if (!options) {
    return undefined;
  }
  const rest = { ...options };
  delete rest.mermaid;
  return Object.keys(rest).length > 0 ? rest : undefined;
}

/**
 * Node {@link Featherdown}: same `parse()` behavior as the browser entry when
 * Mermaid SVG is off. With `mermaid: { render: "svg" }`, Mermaid fences render to
 * inline SVG and `assets.features.mermaid` is set.
 */
export class Featherdown {
  private readonly ctorOptions: NodeFeatherdownOptions | undefined;

  constructor(options?: NodeFeatherdownOptions) {
    this.ctorOptions = options;
  }

  async parse(markdown: string, parseOptions?: NodeFeatherdownParseOptions): Promise<FeatherdownResult> {
    const mermaid = parseOptions?.mermaid ?? this.ctorOptions?.mermaid;
    const mergedOptions = mergeFeatherdownOptions(stripMermaid(this.ctorOptions), stripMermaid(parseOptions));
    const mermaidEnabled = mermaid !== undefined && mermaid !== false;
    return runFeatherdownParse(markdown, mergedOptions, mermaidEnabled ? mermaidPlugins : undefined);
  }

  async parseFile(path: string, parseOptions?: NodeFeatherdownParseOptions): Promise<FeatherdownResult> {
    const markdown = await readFile(path, 'utf8');
    return this.parse(markdown, parseOptions);
  }
}
