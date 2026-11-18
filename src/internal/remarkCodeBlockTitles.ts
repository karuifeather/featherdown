import type { Code, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import { getPipelineContext } from './pipelineContext.js';

const CHART_LANGUAGE_PREFIX = 'chart-';
const TITLE_META_PATTERN = /(?:^|\s)title="([^"]*)"(?:\s|$)/;
const LINE_HIGHLIGHT_PATTERN = /\{([^}]*)\}/;
// Fence meta flags (matched after any `title="..."` is removed from the meta):
//   showLineNumbers | lineNumbers         enable line numbers
//   showLineNumbers=10                    enable, numbering starts at 10
//   showLineNumbers=false | noLineNumbers opt out (overrides `code.lineNumbers: true`)
//   showCopyButton | copyButton           enable the copy button
//   showCopyButton=false | noCopyButton   opt out (overrides `code.copyButton: true`)
//   diff                                  on a non-`diff` language: leading `+` / `-` mark
//                                         added / removed lines and the marker is stripped
const LINE_NUMBERS_PATTERN = /(?:^|\s)(?:showLineNumbers|lineNumbers)(?:=(\d+|false))?(?=\s|$)/;
const NO_LINE_NUMBERS_PATTERN = /(?:^|\s)noLineNumbers(?=\s|$)/;
const COPY_BUTTON_PATTERN = /(?:^|\s)(?:showCopyButton|copyButton)(?:=(false))?(?=\s|$)/;
const NO_COPY_BUTTON_PATTERN = /(?:^|\s)noCopyButton(?=\s|$)/;
const DIFF_FLAG_PATTERN = /(?:^|\s)diff(?=\s|$)/;
// Legacy helpers (no per-parse config) keep the pre-0.5 flag grammar exactly:
// bare flags only, no `=N` / `=false` / `no*` / `diff`.
const LEGACY_LINE_NUMBERS_PATTERN = /(?:^|\s)(?:showLineNumbers|lineNumbers)(?:\s|$)/;
const LEGACY_COPY_BUTTON_PATTERN = /(?:^|\s)(?:showCopyButton|copyButton)(?:\s|$)/;

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

function stripTitle(meta: unknown): string {
  return typeof meta === 'string' ? meta.replace(/title="[^"]*"/, ' ') : '';
}

/** `true`, a start number, `'false'` (explicit opt-out) or undefined (use the global default). */
function getCodeBlockLineNumbers(meta: unknown): true | number | 'false' | undefined {
  const flags = stripTitle(meta);
  if (NO_LINE_NUMBERS_PATTERN.test(flags)) {
    return 'false';
  }
  const match = LINE_NUMBERS_PATTERN.exec(flags);
  if (!match) {
    return undefined;
  }
  const value = match[1];
  if (value === 'false') {
    return 'false';
  }
  if (value === undefined) {
    return true;
  }
  return Math.max(1, Number(value));
}

/** `true`, `'false'` (explicit opt-out) or undefined (use the global default). */
function getCodeBlockCopyButton(meta: unknown): true | 'false' | undefined {
  const flags = stripTitle(meta);
  if (NO_COPY_BUTTON_PATTERN.test(flags)) {
    return 'false';
  }
  const match = COPY_BUTTON_PATTERN.exec(flags);
  if (!match) {
    return undefined;
  }
  return match[1] === 'false' ? 'false' : true;
}

/**
 * For `ts diff`: strips one leading `+` / `-` per line and returns one marker
 * char per line (`a` added, `r` removed, `.` other). Lines without a marker are
 * left untouched (write context lines without a leading space). The `diff`
 * language itself keeps its markers and is handled in the rehype stage.
 */
function extractDiffMarkers(node: Code): string | undefined {
  if (!node.lang || node.lang === 'diff' || !DIFF_FLAG_PATTERN.test(stripTitle(node.meta))) {
    return undefined;
  }
  let markers = '';
  const lines = node.value.split('\n').map((line) => {
    if (line.startsWith('+')) {
      markers += 'a';
      return line.slice(1);
    }
    if (line.startsWith('-')) {
      markers += 'r';
      return line.slice(1);
    }
    markers += '.';
    return line;
  });
  node.value = lines.join('\n');
  return /[ar]/.test(markers) ? markers : undefined;
}

/**
 * Extracts supported fenced code metadata and stores it on hProperties.
 */
export const remarkCodeBlockTitles: Plugin<[], Root> = function remarkCodeBlockTitles() {
  return (tree, file): undefined => {
    // Featherdown parses carry per-parse config; legacy helpers do not.
    const modern = getPipelineContext(file)?.config !== undefined;
    visit(tree, 'code', (node: Code) => {
      if (typeof node.lang === 'string' && node.lang.startsWith(CHART_LANGUAGE_PREFIX)) {
        return;
      }

      const meta = typeof node.meta === 'string' ? node.meta : '';
      const title = getCodeBlockTitle(node.meta);
      const highlights = getCodeBlockHighlightLines(node.meta);
      const lineNumbers = modern
        ? getCodeBlockLineNumbers(node.meta)
        : LEGACY_LINE_NUMBERS_PATTERN.test(meta)
          ? true
          : undefined;
      const copyButton = modern
        ? getCodeBlockCopyButton(node.meta)
        : LEGACY_COPY_BUTTON_PATTERN.test(meta)
          ? true
          : undefined;
      const diffMarkers = modern ? extractDiffMarkers(node) : undefined;
      if (
        title === undefined &&
        highlights.length === 0 &&
        lineNumbers === undefined &&
        copyButton === undefined &&
        diffMarkers === undefined
      ) {
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
      if (lineNumbers !== undefined) {
        node.data.hProperties.dataCodeLineNumbers = lineNumbers;
      }
      if (copyButton !== undefined) {
        node.data.hProperties.dataCodeCopyButton = copyButton;
      }
      if (diffMarkers !== undefined) {
        node.data.hProperties.dataCodeDiffLines = diffMarkers;
      }
    });
  };
};
