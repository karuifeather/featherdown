import type { Root } from 'mdast';
import type { LeafDirective } from 'mdast-util-directive';
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';
import { getPipelineContext } from './pipelineContext.js';

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{1,12}$/;

type Built = { src: string } | { reason: string };

function attr(node: LeafDirective, name: string): string | undefined {
  const value = node.attributes?.[name];
  return typeof value === 'string' ? value.trim() : undefined;
}

function build(node: LeafDirective): Built | undefined {
  switch (node.name) {
    case 'youtube': {
      const id = attr(node, 'id');
      return id && YOUTUBE_ID.test(id)
        ? { src: `https://www.youtube-nocookie.com/embed/${id}` }
        : { reason: '::youtube needs id="<11-character video id>"' };
    }
    case 'vimeo': {
      const id = attr(node, 'id');
      return id && VIMEO_ID.test(id)
        ? { src: `https://player.vimeo.com/video/${id}` }
        : { reason: '::vimeo needs a numeric id' };
    }
    case 'embed': {
      const src = attr(node, 'src');
      // Host / scheme checks happen once, in rehypeEmbeds.
      return src ? { src } : { reason: '::embed needs a src' };
    }
    default:
      return undefined;
  }
}

/**
 * Maps `::youtube{id}`, `::vimeo{id}` and `::embed{src title}` leaf directives
 * to iframe nodes.
 *
 * The iframe is emitted as author content (`data.hName` / `hProperties`, never
 * an HTML string), so it still passes through `rehype-sanitize` and
 * `rehypeEmbeds`: there is a single enforcement point for what may be framed.
 * Only validated values are forwarded; other directive attributes (`class`,
 * `id`, event handlers, ...) are ignored. Invalid directives are removed and
 * reported as `embeds.invalid`.
 */
export default function remarkEmbeds() {
  return (tree: Root, file: VFile): undefined => {
    const context = getPipelineContext(file);
    visit(tree, 'leafDirective', (node, index, parent) => {
      const built = build(node);
      if (!built) return undefined;
      if ('reason' in built) {
        context?.emitDiagnostic?.({
          code: 'embeds.invalid',
          message: `Removed invalid embed directive: ${built.reason}.`,
          severity: 'warning',
          source: 'embeds',
        });
        if (parent && index !== undefined) {
          parent.children.splice(index, 1);
          return index;
        }
        // No parent to remove it from: neutralize so nothing is emitted.
        node.children = [];
        node.data = { hName: 'span', hProperties: {}, hChildren: [] };
        return undefined;
      }
      const title = attr(node, 'title') || labelText(node) || undefined;
      node.children = [];
      node.data = {
        hName: 'iframe',
        hProperties: title ? { src: built.src, title } : { src: built.src },
        hChildren: [],
      };
      return undefined;
    });
  };
}

function labelText(node: LeafDirective): string {
  return node.children
    .map((child) => ('value' in child && typeof child.value === 'string' ? child.value : ''))
    .join('')
    .trim();
}
