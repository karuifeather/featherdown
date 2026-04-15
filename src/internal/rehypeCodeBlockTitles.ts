import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';

const CHART_LANGUAGE_PREFIX = 'language-chart-';
const WRAPPER_CLASS = 'code-block';
const COPYABLE_CLASS = 'code-block-copyable';
const COPY_BUTTON_CLASS = 'code-block-copy-button';

function hasChartLanguage(className: unknown): boolean {
  const values = Array.isArray(className)
    ? className
    : typeof className === 'string'
      ? [className]
      : [];
  return values.some((value) => typeof value === 'string' && value.startsWith(CHART_LANGUAGE_PREFIX));
}

/**
 * Wraps code blocks with stable title and copy-button markup.
 */
const rehypeCodeBlockTitles: Plugin<[], Root> = function rehypeCodeBlockTitles() {
  return (tree): undefined => {
    let copyTargetCount = 0;
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'pre') return;
      if (!parent || typeof index !== 'number') return;

      const code = node.children[0];
      if (!code || code.type !== 'element' || code.tagName !== 'code') return;
      if (hasChartLanguage(code.properties.className)) return;

      const title = code.properties.dataCodeBlockTitle;
      delete code.properties.dataCodeBlockTitle;
      const hasCopyButton =
        code.properties.dataCodeCopyButton === true ||
        code.properties.dataCodeCopyButton === 'true' ||
        code.properties.dataCodeCopyButton === '';
      delete code.properties.dataCodeCopyButton;

      if (typeof title !== 'string' && !hasCopyButton) return;

      const children: Element['children'] = [];
      if (typeof title === 'string') {
        children.push({
          type: 'element',
          tagName: 'div',
          properties: { className: ['code-block-title'] },
          children: [{ type: 'text', value: title }],
        });
      }

      const wrapperClassName = hasCopyButton ? [WRAPPER_CLASS, COPYABLE_CLASS] : [WRAPPER_CLASS];
      if (hasCopyButton) {
        copyTargetCount += 1;
        const copyTargetId = `code-copy-target-${String(copyTargetCount)}`;
        code.properties.dataCodeCopyTarget = copyTargetId;
        children.push({
          type: 'element',
          tagName: 'button',
          properties: {
            type: 'button',
            className: [COPY_BUTTON_CLASS],
            dataCodeCopy: '',
            dataCodeCopyTarget: copyTargetId,
          },
          children: [{ type: 'text', value: 'Copy' }],
        });
      }
      children.push(node);

      const wrapped: Element = {
        type: 'element',
        tagName: 'div',
        properties: { className: wrapperClassName },
        children,
      };

      parent.children[index] = wrapped;
    });
  };
};

export default rehypeCodeBlockTitles;
