import type { Schema } from 'hast-util-sanitize';
import { defaultSchema } from 'rehype-sanitize';
import { CALLOUT_TYPES } from './remarkCallouts.js';

/**
 * Strict schema applied to **author content**, immediately after raw HTML is
 * parsed and before any Featherdown plugin adds trusted markup.
 *
 * Because KaTeX, chart mounts, code-block chrome, heading anchors, syntax
 * highlighting, and image rewriting all run *after* this pass, the schema only
 * needs to keep what Markdown itself produces at that point:
 *
 * - **`code`** — `language-*` plus remark-math's `math-inline` / `math-display`
 *   classes, and the fence-meta data attributes read later by the code plugins.
 * - **Callouts** — `div.callout`, `div.callout-<type>`, `div.callout-title`.
 * - **Headings** — `dataHeadingCustomId` (internal marker, removed before output).
 *
 * No `style` attribute and no free-form `className` are allowed, so raw HTML
 * cannot position overlays or borrow host-app / Featherdown classes beyond the
 * callout classes Markdown directives already grant. Scripts stay stripped.
 */
const baseAttrs = defaultSchema.attributes ?? {};
const baseStar = baseAttrs['*'] ?? [];
const baseDiv = baseAttrs.div ?? [];
const baseH1 = baseAttrs.h1 ?? [];
const baseH2 = baseAttrs.h2 ?? [];
const baseH3 = baseAttrs.h3 ?? [];
const baseH4 = baseAttrs.h4 ?? [];
const baseH5 = baseAttrs.h5 ?? [];
const baseH6 = baseAttrs.h6 ?? [];
const calloutClassNames = [
  'callout',
  ...CALLOUT_TYPES.map((type) => `callout-${type}`),
  'callout-title',
];

export const markdownSanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...baseAttrs,
    code: [
      ['className', /^language-./, 'math-inline', 'math-display'],
      'dataCodeBlockTitle',
      'dataCodeCopyButton',
      'dataCodeLineHighlights',
      'dataCodeLineNumbers',
    ],
    h1: [...baseH1, 'dataHeadingCustomId'],
    h2: [...baseH2, 'dataHeadingCustomId'],
    h3: [...baseH3, 'dataHeadingCustomId'],
    h4: [...baseH4, 'dataHeadingCustomId'],
    h5: [...baseH5, 'dataHeadingCustomId'],
    h6: [...baseH6, 'dataHeadingCustomId'],
    div: [...baseDiv, ['className', ...calloutClassNames]],
  },
};

const svgTags = [
  'svg',
  'g',
  'path',
  'marker',
  'rect',
  'circle',
  'line',
  'polygon',
  'text',
  'tspan',
  'style',
  'foreignObject',
  'defs',
  'symbol',
] as const;

const svgSharedAttributes = [
  'style',
  'transform',
  'fill',
  'stroke',
  'strokeWidth',
  'strokeDasharray',
  'id',
  'className',
] as const;

/**
 * Second-pass schema for the Node Mermaid path. It runs right after
 * `rehype-mermaid`, over a tree whose author content already passed
 * {@link markdownSanitizeSchema}, so its looser rules (classes and inline
 * styles on HTML labels, a narrow SVG allowlist) only matter for Mermaid output.
 */
export const schemaWithSvg: Schema = {
  ...markdownSanitizeSchema,
  tagNames: [...(markdownSanitizeSchema.tagNames ?? []), 'button', ...svgTags],
  attributes: {
    ...(markdownSanitizeSchema.attributes ?? {}),
    '*': [...baseStar, 'className'],
    // Code-block chrome is added before Mermaid runs (author buttons were
    // already removed by the strict pass).
    button: [['className', 'code-block-copy-button'], ['type', 'button'], 'dataCodeCopy', 'dataCodeCopyTarget'],
    code: [...(markdownSanitizeSchema.attributes?.code ?? []), 'dataCodeCopyTarget'],
    span: ['style'],
    div: [...baseDiv, 'style', 'xmlns'],
    svg: [
      ...svgSharedAttributes,
      'ariaRoleDescription',
      'role',
      'viewBox',
      'width',
      'xmlns',
    ],
    g: [
      ...svgSharedAttributes,
      'dataId',
      'dataNode',
    ],
    path: [...svgSharedAttributes, 'd', 'markerEnd'],
    marker: [
      ...svgSharedAttributes,
      'markerHeight',
      'markerUnits',
      'markerWidth',
      'orient',
      'refX',
      'refY',
      'viewBox',
    ],
    rect: [...svgSharedAttributes, 'height', 'rx', 'ry', 'width', 'x', 'y', 'name'],
    circle: [...svgSharedAttributes, 'cx', 'cy', 'r'],
    line: [...svgSharedAttributes, 'markerEnd', 'x1', 'x2', 'y1', 'y2'],
    polygon: [...svgSharedAttributes, 'points'],
    text: [
      ...svgSharedAttributes,
      'alignmentBaseline',
      'dominantBaseline',
      'dy',
      'textAnchor',
      'x',
      'y',
    ],
    tspan: [...svgSharedAttributes, 'dy', 'x'],
    foreignObject: ['height', 'width'],
    symbol: ['clipRule', 'fillRule', 'height', 'id', 'width'],
    defs: [],
    style: [],
  },
};
