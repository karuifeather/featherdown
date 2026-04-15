import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';

type ManifestEntry = { url: string };

type RehypeCdnImagesOptions = {
  kind?: string;
  slug?: string;
  manifest?: {
    map?: Record<string, ManifestEntry>;
    remote?: Record<string, ManifestEntry>;
  };
};

const REMOTE_SRC_PATTERN = /^(https?:\/\/|data:|blob:)/;

function getClassList(className: unknown): string[] {
  if (Array.isArray(className)) {
    return className.filter((value): value is string => typeof value === 'string');
  }
  if (typeof className === 'string') {
    return [className];
  }
  return [];
}

function ensureInlineClass(node: Element): void {
  const classes = getClassList(node.properties.className);
  if (!classes.includes('markdown-inline-img')) {
    classes.push('markdown-inline-img');
  }
  node.properties.className = classes;
}

export default function rehypeCdnImages(options?: RehypeCdnImagesOptions) {
  const kind = options?.kind;
  const slug = options?.slug;
  const map = options?.manifest?.map;
  const remote = options?.manifest?.remote;

  return (tree: Root): undefined => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img') return;

      ensureInlineClass(node);

      if (!kind || !slug) return;

      const src = node.properties.src;
      if (typeof src !== 'string') return;

      if (REMOTE_SRC_PATTERN.test(src)) {
        const nextSrc = remote?.[src]?.url;
        if (nextSrc) node.properties.src = nextSrc;
        return;
      }

      if (src.startsWith('/')) return;

      const cleanPath = src.replace(/^\.\/+/, '');
      const key = `${kind}/${slug}/${cleanPath}`;
      const nextSrc = map?.[key]?.url;
      if (nextSrc) node.properties.src = nextSrc;
    });
  };
}
