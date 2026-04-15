import type { Code, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';

const CHART_LANGUAGE_PREFIX = 'chart-';
const TITLE_META_PATTERN = /(?:^|\s)title="([^"]*)"(?:\s|$)/;
const LINE_HIGHLIGHT_PATTERN = /\{([^}]*)\}/;
const LINE_NUMBERS_PATTERN = /(?:^|\s)(?:showLineNumbers|lineNumbers)(?:\s|$)/;
const COPY_BUTTON_PATTERN = /(?:^|\s)(?:showCopyButton|copyButton)(?:\s|$)/;

function getCodeBlockTitle(meta: unknown): string | undefined {
  if (typeof meta !== 'string') {
    return undefined;
  }
  const match = TITLE_META_PATTERN.exec(meta);
  if (!match) {
    return undefined;
  }
  return match[1];
}

function getCodeBlockHighlightLines(meta: unknown): number[] {
  if (typeof meta !== 'string') {
    return [];
  }
  const match = LINE_HIGHLIGHT_PATTERN.exec(meta);
  const raw = match?.[1];
  if (!raw) {
    return [];
  }

  const highlights = new Set<number>();
  const fragments = raw.split(',');
  for (const fragment of fragments) {
    const value = fragment.trim();
    if (/^\d+$/.test(value)) {
      const line = Number(value);
      if (line > 0) {
        highlights.add(line);
      }
      continue;
    }

    const rangeMatch = /^(\d+)-(\d+)$/.exec(value);
    if (!rangeMatch) {
      continue;
    }

    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    if (start <= 0 || end <= 0 || start > end) {
      continue;
    }
    for (let line = start; line <= end; line += 1) {
      highlights.add(line);
    }
  }

  return Array.from(highlights).sort((a, b) => a - b);
}

function hasCodeBlockLineNumbers(meta: unknown): boolean {
  return typeof meta === 'string' && LINE_NUMBERS_PATTERN.test(meta);
}

function hasCodeBlockCopyButton(meta: unknown): boolean {
  return typeof meta === 'string' && COPY_BUTTON_PATTERN.test(meta);
}

/**
 * Extracts supported fenced code metadata and stores it on hProperties.
 */
export const remarkCodeBlockTitles: Plugin<[], Root> = function remarkCodeBlockTitles() {
  return (tree): undefined => {
    visit(tree, 'code', (node: Code) => {
      if (typeof node.lang === 'string' && node.lang.startsWith(CHART_LANGUAGE_PREFIX)) {
        return;
      }

      const title = getCodeBlockTitle(node.meta);
      const highlights = getCodeBlockHighlightLines(node.meta);
      const hasLineNumbers = hasCodeBlockLineNumbers(node.meta);
      const hasCopyButton = hasCodeBlockCopyButton(node.meta);
      if (title === undefined && highlights.length === 0 && !hasLineNumbers && !hasCopyButton) {
        return;
      }

      node.data ??= {};
      node.data.hProperties ??= {};

      if (title !== undefined) {
        node.data.hProperties.dataCodeBlockTitle = title;
      }
      if (highlights.length > 0) {
        node.data.hProperties.dataCodeLineHighlights = highlights;
      }
      if (hasLineNumbers) {
        node.data.hProperties.dataCodeLineNumbers = true;
      }
      if (hasCopyButton) {
        node.data.hProperties.dataCodeCopyButton = true;
      }
    });
  };
};
