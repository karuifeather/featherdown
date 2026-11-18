import type { Root } from 'hast';
import { visit } from 'unist-util-visit';

export const CLOBBER_PREFIX = 'user-content-';

function decodeFragment(fragment: string): string {
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}

/**
 * Re-points same-document links at ids the sanitizer clobber-prefixed.
 *
 * `rehype-sanitize` prefixes every author `id` with `user-content-` (so author
 * markup cannot shadow host-page globals) but leaves `href` alone. Footnote
 * references and links to `{#custom}` heading ids would otherwise point at the
 * unprefixed id. Footnote links are always re-pointed. Any other `#x` href is rewritten to `#user-content-x` only when the
 * document has `user-content-x` and no `x`, so links to unprefixed ids (for
 * example `rehype-slug` heading ids) are untouched.
 */
export default function rehypeResolveClobberedHrefs() {
  return (tree: Root): undefined => {
    const ids = new Set<string>();
    visit(tree, 'element', (node) => {
      const id = node.properties.id;
      if (typeof id === 'string') ids.add(id);
    });

    visit(tree, 'element', (node) => {
      const href = node.properties.href;
      if (typeof href !== 'string' || !href.startsWith('#') || href.length < 2) return;
      const target = decodeFragment(href.slice(1));
      const prefixed = `${CLOBBER_PREFIX}${target}`;
      // GFM footnote refs / backrefs always target the (sanitizer-prefixed)
      // footnote ids, even if an author heading slug happens to equal `fn-1`.
      const isFootnoteLink =
        node.properties.dataFootnoteRef !== undefined || node.properties.dataFootnoteBackref !== undefined;
      if (isFootnoteLink) {
        if (!target.startsWith(CLOBBER_PREFIX)) node.properties.href = `#${prefixed}`;
        return;
      }
      if (ids.has(target)) return;
      if (ids.has(prefixed)) {
        node.properties.href = `#${prefixed}`;
      }
    });
  };
}
