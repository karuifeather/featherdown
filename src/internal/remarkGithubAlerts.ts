import type { Blockquote, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { DEFAULT_TITLES, createTitleNode, type SupportedCalloutType } from './remarkCallouts.js';

type AlertType = Extract<SupportedCalloutType, 'note' | 'tip' | 'important' | 'warning' | 'caution'>;

const MARKER = /^\[!(note|tip|important|warning|caution)\][ \t]*([^\n]*)(?:\n|$)/i;

/**
 * Maps GitHub alerts (`> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`,
 * `[!CAUTION]`) to the same markup as `:::note` style callouts. Text after the
 * marker on the same line becomes a custom title.
 */
export default function remarkGithubAlerts() {
  return (tree: Root): void => {
    visit(tree, 'blockquote', (node: Blockquote) => {
      const first = node.children[0];
      if (!first || first.type !== 'paragraph') {
        return;
      }
      const text = first.children[0];
      if (!text || text.type !== 'text') {
        return;
      }
      const match = MARKER.exec(text.value);
      if (!match) {
        return;
      }
      const type = (match[1] ?? '').toLowerCase() as AlertType;
      const title = (match[2] ?? '').replace(/\s+/g, ' ').trim() || DEFAULT_TITLES[type];

      text.value = text.value.slice(match[0].length);
      if (text.value === '') {
        first.children.shift();
        // A hard break right after the marker line is just the line ending.
        if (first.children[0]?.type === 'break') {
          first.children.shift();
        }
      }
      const rest = first.children.length > 0 ? node.children : node.children.slice(1);

      node.children = [createTitleNode(title), ...rest];
      node.data = {
        ...(node.data ?? {}),
        hName: 'div',
        hProperties: { className: ['callout', `callout-${type}`] },
      };
    });
  };
}
