import type { Schema } from 'hast-util-sanitize';
import { defaultSchema } from 'rehype-sanitize';
import { CHART_BLOCK_TYPES } from './chartTypes.js';

/**
 * Extends the GitHub-style default sanitizer for this pipeline:
 *
 * - **`className` on `*`** — highlight.js and KaTeX mark up nested spans (and raw HTML
 *   may set classes on other allowed tags). The base schema does not allow
 *   arbitrary classes without this.
 * - **`style` on `span` only** — KaTeX `output: 'html'` uses inline `style` on spans for
 *   layout; samples from KaTeX do not attach `style` to other tag names. Allowing
 *   `style` on every element would broaden XSS surface for author-controlled raw HTML.
 * - **Chart placeholders** — `div.chart-mount` with `dataChart` / `dataChartData` (narrow
 *   allowed chart type strings; data payload is the JSON string).
 *
 * Scripts remain stripped (`strip: ['script']`).
 */
const baseAttrs = defaultSchema.attributes ?? {};
const baseStar = baseAttrs['*'] ?? [];
const baseSpan = baseAttrs.span ?? [];
const baseDiv = baseAttrs.div ?? [];
const baseCode = baseAttrs.code ?? [];
const baseButton = baseAttrs.button ?? [];
const baseH1 = baseAttrs.h1 ?? [];
const baseH2 = baseAttrs.h2 ?? [];
const baseH3 = baseAttrs.h3 ?? [];
const baseH4 = baseAttrs.h4 ?? [];
const baseH5 = baseAttrs.h5 ?? [];
const baseH6 = baseAttrs.h6 ?? [];
const baseTags = defaultSchema.tagNames ?? [];
const calloutClassNames = [
  'callout',
  'callout-note',
  'callout-tip',
  'callout-warning',
  'callout-info',
  'callout-success',
  'callout-danger',
  'callout-error',
  'callout-caution',
  'callout-important',
  'callout-title',
  'chart-mount',
  'code-block',
  'code-block-title',
  'code-block-copyable',
] as const;
const buttonClassNames = ['code-block-copy-button'] as const;

export const markdownSanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: [...baseTags, 'button'],
  attributes: {
    ...baseAttrs,
    '*': [...baseStar, 'className'],
    span: [...baseSpan, 'style'],
    code: [...baseCode, 'className', 'dataCodeCopyTarget', 'dataCodeLineHighlights', 'dataCodeLineNumbers'],
    button: [...baseButton, ['className', ...buttonClassNames], 'type', 'dataCodeCopy', 'dataCodeCopyTarget'],
    h1: [...baseH1, 'dataHeadingCustomId'],
    h2: [...baseH2, 'dataHeadingCustomId'],
    h3: [...baseH3, 'dataHeadingCustomId'],
    h4: [...baseH4, 'dataHeadingCustomId'],
    h5: [...baseH5, 'dataHeadingCustomId'],
    h6: [...baseH6, 'dataHeadingCustomId'],
    div: [
      ...baseDiv,
      ['className', ...calloutClassNames],
      ['dataChart', ...CHART_BLOCK_TYPES],
      'dataChartData',
    ],
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
 * Mermaid-capable sanitizer schema for the Node-only rendering path.
 * It extends the browser-safe schema with a narrow SVG allowlist used by
 * inline Mermaid output.
 */
export const schemaWithSvg: Schema = {
  ...markdownSanitizeSchema,
  tagNames: [...(markdownSanitizeSchema.tagNames ?? []), ...svgTags],
  attributes: {
    ...(markdownSanitizeSchema.attributes ?? {}),
    div: [
      ...baseDiv,
      'style',
      'xmlns',
      ['className', ...calloutClassNames],
      ['dataChart', ...CHART_BLOCK_TYPES],
      'dataChartData',
    ],
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
