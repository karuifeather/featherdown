import type { Element } from 'hast';
import rehypeMermaid from 'rehype-mermaid';
import rehypeSanitize from 'rehype-sanitize';
import type { PluggableList } from 'unified';
import type { MermaidPluginsFactory } from './createMarkdownProcessorInternal.js';
import { schemaWithSvg } from './sanitizeSchema.js';

const fallbackToOriginalCodeBlock = (element: Element): Element => element;

/**
 * Distinct attacher for the post-Mermaid sanitize pass. unified merges repeated
 * `.use()` calls of the *same* plugin function, so reusing `rehypeSanitize`
 * here would silently replace the strict author-content pass instead of adding
 * a second one.
 */
function rehypeSanitizeMermaidOutput() {
  return rehypeSanitize(schemaWithSvg);
}

/**
 * Node-only Mermaid stage: renders fences to inline SVG (falling back to the
 * original code block on error), then sanitizes the result with the SVG-aware
 * schema because diagram source is author-controlled.
 */
export const mermaidPlugins: MermaidPluginsFactory = (gates) => {
  const plugins: PluggableList = [
    [rehypeMermaid, { strategy: 'inline-svg', errorFallback: fallbackToOriginalCodeBlock }],
  ];
  if (gates.sanitize) {
    plugins.push(rehypeSanitizeMermaidOutput);
  }
  return plugins;
};
