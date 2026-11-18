import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';
import { getPipelineContext } from './pipelineContext.js';

/**
 * Whether `hostname` matches an `internalHosts` entry. Entries match
 * case-insensitively. `*.example.com` matches subdomains only (`blog.example.com`,
 * `a.b.example.com`) and NOT the apex `example.com`; list the apex separately.
 */
function matchesHost(hostname: string, entry: string): boolean {
  const pattern = entry.trim().toLowerCase();
  if (!pattern) return false;
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1);
    return hostname.endsWith(suffix) && hostname.length > suffix.length;
  }
  return hostname === pattern;
}

function externalHostname(href: string): string | undefined {
  const trimmed = href.trim();
  let candidate: string;
  if (trimmed.startsWith('//')) {
    candidate = `https:${trimmed}`;
  } else if (/^https?:\/\//i.test(trimmed)) {
    candidate = trimmed;
  } else {
    return undefined;
  }
  try {
    const hostname = new URL(candidate).hostname.toLowerCase();
    return hostname || undefined;
  } catch {
    return undefined;
  }
}

function tokens(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') return value.split(/\s+/).filter(Boolean);
  return [];
}

/**
 * Adds `rel` / `target` to external links (absolute http(s) or protocol-relative
 * URLs whose host is not in `internalHosts`). Existing `rel` tokens are kept and
 * merged without duplicates; an existing `target` is left alone. Relative links,
 * `mailto:`, `#` anchors and malformed URLs are skipped.
 *
 * Config is read from the vfile per parse (processors are cached and shared).
 */
export default function rehypeLinks() {
  return (tree: Root, file?: { data: unknown }): Root => {
    const config = getPipelineContext(file)?.config?.links;
    if (!config?.enabled) return tree;
    const { rel, target, internalHosts } = config;
    if (rel === false && target === false) return tree;

    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'a') return;
      const href = node.properties.href;
      if (typeof href !== 'string') return;
      const hostname = externalHostname(href);
      if (!hostname) return;
      if (internalHosts.some((entry) => matchesHost(hostname, entry))) return;

      if (rel !== false) {
        const merged = tokens(node.properties.rel);
        for (const token of tokens(rel)) {
          if (!merged.includes(token)) merged.push(token);
        }
        if (merged.length > 0) node.properties.rel = merged;
      }
      if (target !== false && node.properties.target === undefined) {
        node.properties.target = target;
      }
    });
    return tree;
  };
}
