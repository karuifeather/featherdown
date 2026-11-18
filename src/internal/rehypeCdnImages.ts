import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';
import type { DiagnosticEmitter } from './diagnostics.js';
import { getPipelineContext } from './pipelineContext.js';

type ManifestEntry = { url: string; width?: number; height?: number };

type RehypeCdnImagesOptions = {
  kind?: string;
  slug?: string;
  manifest?: {
    map?: Record<string, ManifestEntry>;
    remote?: Record<string, ManifestEntry>;
  };
  emitDiagnostic?: DiagnosticEmitter;
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

function applyDimensions(node: Element, entry: ManifestEntry): void {
  for (const key of ['width', 'height'] as const) {
    const value = entry[key];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      node.properties[key] = Math.round(value);
    }
  }
}

function ensureInlineClass(node: Element): void {
  const classes = getClassList(node.properties.className);
  if (!classes.includes('markdown-inline-img')) {
    classes.push('markdown-inline-img');
  }
  node.properties.className = classes;
}

/**
 * Rehype plugin that annotates image classes and rewrites image URLs via
 * optional manifest maps.
 *
 * When no options are passed, per-parse options are read from the vfile
 * (see `pipelineContext.ts`) so a cached processor can serve every parse.
 */
export default function rehypeCdnImages(options?: RehypeCdnImagesOptions) {
  return (tree: Root, file?: { data: unknown }): undefined => {
    const resolved = options ?? getPipelineContext(file);
    const kind = resolved?.kind;
    const slug = resolved?.slug;
    const map = resolved?.manifest?.map;
    const remote = resolved?.manifest?.remote;
    const emitDiagnostic = resolved?.emitDiagnostic;

    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img') return;

      ensureInlineClass(node);

      if (!kind || !slug) return;

      const src = node.properties.src;
      if (typeof src !== 'string') return;

      if (REMOTE_SRC_PATTERN.test(src)) {
        const entry = remote?.[src];
        if (entry?.url) {
          node.properties.src = entry.url;
          applyDimensions(node, entry);
        }
        return;
      }

      if (src.startsWith('/')) return;

      const cleanPath = src.replace(/^\.\/+/, '');
      const key = `${kind}/${slug}/${cleanPath}`;
      const entry = map?.[key];
      if (entry?.url) {
        node.properties.src = entry.url;
        applyDimensions(node, entry);
      } else {
        emitDiagnostic?.({
          code: 'images.manifest_miss',
          message: `No manifest entry found for "${key}".`,
          severity: 'warning',
          source: 'images',
        });
      }
    });
  };
}
