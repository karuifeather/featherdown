import type { FeatherdownOptions } from './types.js';

/**
 * Node-only Mermaid rendering intent for {@link Featherdown} from `featherdown/node`.
 * SVG rendering uses the optional Playwright peer; see `featherdown` docs.
 */
export type NodeFeatherdownMermaidOptions = {
  render: 'svg';
};

/**
 * {@link FeatherdownOptions} plus optional Mermaid SVG rendering (Node entry only).
 */
export type NodeFeatherdownOptions = FeatherdownOptions & {
  mermaid?: false | NodeFeatherdownMermaidOptions;
};

/**
 * Per-call options for Node {@link Featherdown.parse} / {@link Featherdown.parseFile}.
 */
export type NodeFeatherdownParseOptions = NodeFeatherdownOptions;
