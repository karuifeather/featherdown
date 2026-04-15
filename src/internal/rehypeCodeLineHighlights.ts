import type { Element, ElementContent, Root, Text } from 'hast';
import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';

const CHART_LANGUAGE_PREFIX = 'language-chart-';
const CODE_LINE_CLASS = 'code-line';
const CODE_LINE_HIGHLIGHTED_CLASS = 'code-line-highlighted';
const CODE_LINE_NUMBERED_CLASS = 'code-line-numbered';
const CODE_LINE_NUMBER_CLASS = 'code-line-number';

function hasChartLanguage(className: unknown): boolean {
  const values = Array.isArray(className)
    ? className
    : typeof className === 'string'
      ? [className]
      : [];
  return values.some((value) => typeof value === 'string' && value.startsWith(CHART_LANGUAGE_PREFIX));
}

function getHighlightLines(value: unknown): Set<number> {
  const lines = new Set<number>();

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'number' && Number.isInteger(item) && item > 0) {
        lines.add(item);
      }
      if (typeof item === 'string' && /^\d+$/.test(item)) {
        lines.add(Number(item));
      }
    }
    return lines;
  }

  if (typeof value === 'string') {
    for (const fragment of value.split(/[^\d]+/)) {
      const trimmed = fragment.trim();
      if (/^\d+$/.test(trimmed)) {
        lines.add(Number(trimmed));
      }
    }
  }
  return lines;
}

function getShowLineNumbers(value: unknown): boolean {
  return value === true || value === 'true' || value === '';
}

function ensureClassNameList(className: unknown): string[] {
  if (Array.isArray(className)) {
    return className.filter((entry): entry is string => typeof entry === 'string');
  }
  if (typeof className === 'string') {
    return [className];
  }
  return [];
}

function splitCodeChildrenIntoLines(children: ElementContent[]): ElementContent[][] {
  const lines: ElementContent[][] = [[]];
  for (const child of children) {
    if (child.type !== 'text') {
      const current = lines[lines.length - 1];
      if (!current) {
        continue;
      }
      current.push(child);
      continue;
    }

    const segments = child.value.split('\n');
    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      if (segment && segment.length > 0) {
        const current = lines[lines.length - 1];
        if (!current) {
          continue;
        }
        current.push({ type: 'text', value: segment });
      }
      if (i < segments.length - 1) {
        lines.push([]);
      }
    }
  }
  return lines;
}

function isEmptyLine(line: ElementContent[]): boolean {
  return line.length === 0 || line.every((node) => node.type === 'text' && node.value.length === 0);
}

/**
 * Adds line-level wrappers and highlight classes for configured code ranges.
 */
const rehypeCodeLineHighlights: Plugin<[], Root> = function rehypeCodeLineHighlights() {
  return (tree): undefined => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'code') return;
      if (hasChartLanguage(node.properties.className)) return;

      const highlightLines = getHighlightLines(node.properties.dataCodeLineHighlights);
      delete node.properties.dataCodeLineHighlights;
      const showLineNumbers = getShowLineNumbers(node.properties.dataCodeLineNumbers);
      delete node.properties.dataCodeLineNumbers;
      if (highlightLines.size === 0 && !showLineNumbers) return;

      if (showLineNumbers) {
        const classNames = ensureClassNameList(node.properties.className);
        if (!classNames.includes(CODE_LINE_NUMBERED_CLASS)) {
          classNames.push(CODE_LINE_NUMBERED_CLASS);
        }
        node.properties.className = classNames;
      }

      const splitLines = splitCodeChildrenIntoLines(node.children);
      const lastLine = splitLines[splitLines.length - 1];
      const hasTrailingNewline = splitLines.length > 0 && !!lastLine && isEmptyLine(lastLine);
      const contentLines = hasTrailingNewline ? splitLines.slice(0, -1) : splitLines;

      const children: ElementContent[] = [];
      for (let i = 0; i < contentLines.length; i += 1) {
        const lineNumber = i + 1;
        const className = highlightLines.has(lineNumber)
          ? [CODE_LINE_CLASS, CODE_LINE_HIGHLIGHTED_CLASS]
          : [CODE_LINE_CLASS];
        const lineChildren: ElementContent[] = [];
        if (showLineNumbers) {
          lineChildren.push({
            type: 'element',
            tagName: 'span',
            properties: { className: [CODE_LINE_NUMBER_CLASS] },
            children: [{ type: 'text', value: String(lineNumber) }],
          });
        }
        lineChildren.push(...(contentLines[i] ?? []));
        const lineSpan: Element = {
          type: 'element',
          tagName: 'span',
          properties: { className },
          children: lineChildren,
        };
        children.push(lineSpan);

        if (i < contentLines.length - 1 || hasTrailingNewline) {
          const newline: Text = { type: 'text', value: '\n' };
          children.push(newline);
        }
      }

      node.children = children;
    });
  };
};

export default rehypeCodeLineHighlights;
