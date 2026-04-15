import type { Schema } from 'hast-util-sanitize';
import { defaultSchema } from 'rehype-sanitize';

/**
 * Extends the GitHub-style default sanitizer for this pipeline:
 *
 * - **`className` on `*`** — highlight.js and KaTeX mark up nested spans (and raw HTML
 *   may set classes on other allowed tags). The base schema does not allow
 *   arbitrary classes without this.
 * - **`style` on `span` only** — KaTeX `output: 'html'` uses inline `style` on spans for
 *   layout; samples from KaTeX do not attach `style` to other tag names. Allowing
 *   `style` on every element would broaden XSS surface for author-controlled raw HTML.
 *
 * Scripts remain stripped (`strip: ['script']`).
 */
const baseAttrs = defaultSchema.attributes ?? {};
const baseStar = baseAttrs['*'] ?? [];
const baseSpan = baseAttrs.span ?? [];

export const markdownSanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...baseAttrs,
    '*': [...baseStar, 'className'],
    span: [...baseSpan, 'style'],
  },
};
