import type { Element, Root } from 'hast';
import { SKIP, visit } from 'unist-util-visit';

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
 *
 * Author ids that the sanitizer prefixed into a GFM footnote id (for example
 * `## Top {#fn-1}` becoming `user-content-fn-1`) are first renamed with a
 * numeric suffix (`user-content-fn-1-1`), so every id stays unique and the
 * footnote keeps its own id.
 */
export default function rehypeResolveClobberedHrefs() {
  return (tree: Root): undefined => {
    renameIdsCollidingWithFootnotes(tree);

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

function isFootnotesSection(node: Element): boolean {
  return node.tagName === 'section' && node.properties.dataFootnotes !== undefined;
}

/** Ids GFM generated for footnotes: the refs, plus everything inside the footnotes section. */
function collectFootnoteElements(tree: Root): Set<Element> {
  const owned = new Set<Element>();
  visit(tree, 'element', (node) => {
    if (isFootnotesSection(node)) {
      visit(node, 'element', (inner) => {
        if (typeof inner.properties.id === 'string') owned.add(inner);
      });
      return SKIP;
    }
    if (node.properties.dataFootnoteRef !== undefined && typeof node.properties.id === 'string') {
      owned.add(node);
    }
    return undefined;
  });
  return owned;
}

function renameIdsCollidingWithFootnotes(tree: Root): void {
  const footnoteElements = collectFootnoteElements(tree);
  if (footnoteElements.size === 0) return;

  const footnoteIds = new Set<string>();
  for (const el of footnoteElements) footnoteIds.add(el.properties.id as string);

  const taken = new Set<string>();
  visit(tree, 'element', (node) => {
    if (typeof node.properties.id === 'string') taken.add(node.properties.id);
  });

  visit(tree, 'element', (node) => {
    const id = node.properties.id;
    if (typeof id !== 'string' || !footnoteIds.has(id) || footnoteElements.has(node)) return;
    let n = 1;
    while (taken.has(`${id}-${String(n)}`)) n += 1;
    const renamed = `${id}-${String(n)}`;
    taken.add(renamed);
    node.properties.id = renamed;
  });
}
