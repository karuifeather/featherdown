import type { Schema } from 'hast-util-sanitize';
import { defaultSchema } from 'rehype-sanitize';

/**
 * Extends the GitHub-style default sanitizer so KaTeX (`output: 'html'`) and
 * syntax highlighting can keep the `className` and `style` properties they rely on.
 * Scripts remain stripped (`strip: ['script']`). This is intentionally narrower
 * than hand-tuning SVG or custom widgets—those belong in a separate hardening pass.
 */
const baseAttrs = defaultSchema.attributes ?? {};
const baseStar = baseAttrs['*'] ?? [];

export const markdownSanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...baseAttrs,
    '*': [...baseStar, 'className', 'style'],
  },
};
