import type { Blockquote, PhrasingContent, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { DEFAULT_TITLES, createTitleNode, type SupportedCalloutType } from './remarkCallouts.js';

type AlertType = Extract<SupportedCalloutType, 'note' | 'tip' | 'important' | 'warning' | 'caution'>;

const MARKER = /^\[!(note|tip|important|warning|caution)\][ \t]*/i;

/** Plain text of inline nodes (titles are rendered as text, never markup). */
function plainText(node: PhrasingContent): string {
  if ('value' in node && typeof node.value === 'string') return node.value;
  if ('children' in node) return node.children.map(plainText).join('');
  return '';
}

/**
 * Removes the rest of the marker line from the paragraph's inline children and
 * returns its plain text. The line ends at a hard break or a newline in text;
 * inline markup on it (`**bold**`, `code`) contributes its text.
 */
function takeFirstLine(children: PhrasingContent[]): string {
  let title = '';
  while (children.length > 0) {
    const node = children[0];
    if (!node) break;
    if (node.type === 'break') {
      children.shift();
      break;
    }
    if (node.type === 'text') {
      const newline = node.value.indexOf('\n');
      if (newline !== -1) {
        title += node.value.slice(0, newline);
        node.value = node.value.slice(newline + 1);
        if (node.value === '') children.shift();
        break;
      }
    }
    title += plainText(node);
    children.shift();
  }
  return title;
}

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
      text.value = text.value.slice(match[0].length);
      const title = takeFirstLine(first.children).replace(/\s+/g, ' ').trim() || DEFAULT_TITLES[type];
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
