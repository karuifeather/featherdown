import type { BlockContent, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { extractDirectiveLabel } from './remarkCallouts.js';

const DEFAULT_SUMMARY = 'Details';

/**
 * Maps `:::details[Summary]` container directives to
 * `<details class="details"><summary>Summary</summary>…</details>`.
 * `:::details[Summary]{open}` renders an initially expanded `<details open>`.
 */
export default function remarkDetails() {
  return (tree: Root): void => {
    visit(tree, 'containerDirective', (node) => {
      if (node.name !== 'details') {
        return;
      }
      const { label, bodyChildren } = extractDirectiveLabel(node.children as BlockContent[]);
      const summary = {
        type: 'paragraph' as const,
        data: { hName: 'summary' },
        children: [{ type: 'text' as const, value: label ?? DEFAULT_SUMMARY }],
      };
      const attrs = node.attributes ?? {};
      const isOpen = Object.prototype.hasOwnProperty.call(attrs, 'open') && attrs.open !== 'false';
      node.children = [summary, ...bodyChildren];
      // Retype so remarkCallouts (which turns unknown container directives back
      // into text) leaves it alone; mdast-util-to-hast renders unknown nodes
      // that carry `hName` as elements with their children.
      (node as { type: string }).type = 'featherdownDetails';
      node.data = {
        ...(node.data ?? {}),
        hName: 'details',
        hProperties: {
          className: ['details'],
          ...(isOpen ? { open: true } : {}),
        },
      };
    });
  };
}
