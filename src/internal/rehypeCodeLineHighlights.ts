import type { Element, ElementContent, Root, Text } from 'hast';
import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import { getPipelineContext } from './pipelineContext.js';

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

const CODE_LINE_ADDED_CLASS = 'code-line-added';
const CODE_LINE_REMOVED_CLASS = 'code-line-removed';

/**
 * Resolves line numbering: `undefined` = off, otherwise the first line number.
 * Per-fence value (`true` / '' / 'true' / numeric string / 'false') wins over the
 * global default. The global default never applies to Mermaid fences.
 */
function getLineNumberStart(value: unknown, globalDefault: boolean, isMermaid: boolean): number | undefined {
  if (value === 'false') return undefined;
  if (value === true || value === 'true' || value === '') return 1;
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Math.max(1, Number(value));
  return globalDefault && !isMermaid ? 1 : undefined;
}

function textOf(nodes: ElementContent[]): string {
  let out = '';
  for (const n of nodes) {
    if (n.type === 'text') out += n.value;
    else if (n.type === 'element') out += textOf(n.children);
    if (out.length > 0) break;
  }
  return out;
}

/** Diff state of a line of a `diff`-language fence: `+` added, `-` removed (not `+++` / `---` headers). */
function diffLanguageMarker(line: ElementContent[]): 'a' | 'r' | undefined {
  const text = textOf(line);
  if (text.startsWith('+') && !text.startsWith('+++')) return 'a';
  if (text.startsWith('-') && !text.startsWith('---')) return 'r';
  return undefined;
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
  return (tree, file): undefined => {
    // Read per parse: the processor is cached and shared across parses.
    const globalLineNumbers = getPipelineContext(file)?.config?.code?.lineNumbers === true;
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'code') return;
      if (hasChartLanguage(node.properties.className)) return;

      const highlightLines = getHighlightLines(node.properties.dataCodeLineHighlights);
      delete node.properties.dataCodeLineHighlights;
      const classList = ensureClassNameList(node.properties.className);
      const isMermaid = classList.includes('language-mermaid');
      const lineNumberStart = getLineNumberStart(
        node.properties.dataCodeLineNumbers,
        globalLineNumbers,
        isMermaid,
      );
      delete node.properties.dataCodeLineNumbers;
      const showLineNumbers = lineNumberStart !== undefined;
      const diffMarkers =
        typeof node.properties.dataCodeDiffLines === 'string' ? node.properties.dataCodeDiffLines : '';
      delete node.properties.dataCodeDiffLines;
      const isDiffLanguage = classList.includes('language-diff');
      if (highlightLines.size === 0 && !showLineNumbers && !isDiffLanguage && diffMarkers === '') return;

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
        // Highlight ranges and diff markers index lines within the block (1-based);
        // only the displayed number is offset by the start value.
        const lineNumber = i + 1;
        const displayNumber = (lineNumberStart ?? 1) + i;
        const className = highlightLines.has(lineNumber)
          ? [CODE_LINE_CLASS, CODE_LINE_HIGHLIGHTED_CLASS]
          : [CODE_LINE_CLASS];
        const marker = diffMarkers[i];
        const diffState = isDiffLanguage
          ? diffLanguageMarker(contentLines[i] ?? [])
          : marker === 'a' || marker === 'r'
            ? marker
            : undefined;
        if (diffState === 'a') className.push(CODE_LINE_ADDED_CLASS);
        if (diffState === 'r') className.push(CODE_LINE_REMOVED_CLASS);
        const lineChildren: ElementContent[] = [];
        if (showLineNumbers) {
          lineChildren.push({
            type: 'element',
            tagName: 'span',
            properties: { className: [CODE_LINE_NUMBER_CLASS] },
            children: [{ type: 'text', value: String(displayNumber) }],
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
