import type { Element, Root } from 'hast';
import { SKIP, visit } from 'unist-util-visit';

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

/**
 * Renames author ids that the sanitizer prefixed into a GFM footnote id (for
 * example `## Top {#fn-1}` becoming `user-content-fn-1`) with a numeric suffix
 * (`user-content-fn-1-1`), so every id stays unique and the footnote keeps its
 * own id. Runs right after sanitize, before heading anchors, toc extraction and
 * href resolution, so they all see the final id.
 */
export default function rehypeDedupeFootnoteIds() {
  return (tree: Root): undefined => {
    renameIdsCollidingWithFootnotes(tree);
  };
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
