import type { Element, Root } from 'hast';
import { sanitize } from 'hast-util-sanitize';
import rehypeMermaid from 'rehype-mermaid';
import type { PluggableList } from 'unified';
import type { MermaidPluginsFactory } from './createMarkdownProcessorInternal.js';
import { schemaWithSvg } from './sanitizeSchema.js';

const fallbackToOriginalCodeBlock = (element: Element): Element => element;

/**
 * Post-Mermaid sanitize pass, scoped to `<svg>` subtrees only.
 *
 * The rest of the tree already went through the strict author-content pass.
 * Re-sanitizing it would clobber-prefix every `id` a second time
 * (`user-content-user-content-…`), breaking footnote and heading anchors and
 * making Node output diverge from the browser entry. Author-written `<svg>`
 * cannot reach this point (the strict schema drops it), so every `<svg>` here
 * is Mermaid output.
 */
function rehypeSanitizeMermaidOutput() {
  return (tree: Root): undefined => {
    const walk = (parent: { children: Root['children'] | Element['children'] }): void => {
      for (let index = parent.children.length - 1; index >= 0; index--) {
        const child = parent.children[index];
        if (!child || child.type !== 'element') continue;
        if (child.tagName !== 'svg') {
          walk(child);
          continue;
        }
        const clean = sanitize(child, schemaWithSvg);
        // sanitize() returns a root when the element itself is dropped.
        const replacement = clean.type === 'root' ? clean.children : [clean];
        parent.children.splice(index, 1, ...(replacement as Element[]));
      }
    };
    walk(tree);
  };
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
