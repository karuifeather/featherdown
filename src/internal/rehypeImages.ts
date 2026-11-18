import type { Element, ElementContent, Root } from 'hast';
import { visit } from 'unist-util-visit';
import { getPipelineContext } from './pipelineContext.js';

function isBlank(node: ElementContent): boolean {
  return node.type === 'text' && node.value.trim() === '';
}

function meaningful(node: Element): ElementContent[] {
  return node.children.filter((child) => !isBlank(child));
}

function isImg(node: ElementContent | undefined): node is Element {
  return node !== undefined && node.type === 'element' && node.tagName === 'img';
}

function captionOf(img: Element): string {
  const title = img.properties.title;
  return typeof title === 'string' ? title.trim() : '';
}

/**
 * Finds the image of a paragraph whose only meaningful child is an `<img>` or an
 * `<a>` wrapping only an `<img>`.
 */
function figureParts(p: Element): { img: Element; root: Element } | undefined {
  const kids = meaningful(p);
  if (kids.length !== 1) return undefined;
  const only = kids[0];
  if (!only) return undefined;
  if (only.type !== 'element') return undefined;
  if (only.tagName === 'img') return { img: only, root: only };
  if (only.tagName === 'a') {
    const inner = meaningful(only);
    const img = inner[0];
    if (inner.length === 1 && isImg(img)) return { img, root: only };
  }
  return undefined;
}

/**
 * Adds `loading` / `decoding` to images (never overriding existing values) and,
 * when `figure` is on, turns a paragraph holding only a titled image (optionally
 * wrapped in a link) into `<figure class="markdown-figure">` with a
 * `<figcaption>` from the title. The `title` attribute is dropped from the image
 * in that case to avoid a duplicate tooltip. The caption is a text node, so it is
 * escaped on serialization.
 *
 * Config is read from the vfile per parse (processors are cached and shared).
 */
export default function rehypeImages() {
  return (tree: Root, file?: { data: unknown }): Root => {
    const config = getPipelineContext(file)?.config?.images;
    if (!config?.enabled) return tree;

    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'img') return;
      if (config.lazy && node.properties.loading === undefined) {
        node.properties.loading = 'lazy';
      }
      if (config.decoding && node.properties.decoding === undefined) {
        node.properties.decoding = config.decoding;
      }
    });

    if (config.figure) {
      visit(tree, 'element', (node: Element, index, parent) => {
        if (node.tagName !== 'p' || !parent || index === undefined) return;
        const parts = figureParts(node);
        if (!parts) return;
        const caption = captionOf(parts.img);
        if (!caption) return;
        delete parts.img.properties.title;
        const figure: Element = {
          type: 'element',
          tagName: 'figure',
          properties: { className: ['markdown-figure'] },
          children: [
            parts.root,
            {
              type: 'element',
              tagName: 'figcaption',
              properties: {},
              children: [{ type: 'text', value: caption }],
            },
          ],
        };
        (parent.children as ElementContent[])[index] = figure;
      });
    }
    return tree;
  };
}
