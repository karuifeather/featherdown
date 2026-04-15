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
] as const;

export const markdownSanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...baseAttrs,
    '*': [...baseStar, 'className'],
    span: [...baseSpan, 'style'],
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
  tagNames: [...baseTags, ...svgTags],
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
