import type { Element, ElementContent, Properties, Root, RootContent } from 'hast';
import type { VFile } from 'vfile';
import type { FeatherdownEmbedProvider } from '../types.js';
import { getPipelineContext } from './pipelineContext.js';

type EmbedConfig = { enabled: boolean; providers: FeatherdownEmbedProvider[]; allowHosts: string[] };

type ProviderRule = {
  hosts: readonly string[];
  /** Must match `url.pathname` exactly (anchored). */
  path: RegExp;
  /** Extra check on the parsed URL (e.g. required query params). */
  check?: (url: URL) => boolean;
  /** Sandbox tokens the provider's player / editor needs. */
  sandbox: readonly string[];
  /** Permissions Policy for the frame. */
  allow: string;
};

// Video players need scripts and their own origin (cookies-less storage, MSE),
// popups for "watch on ..." links (escaping the sandbox so the opened provider
// page works normally) and presentation for casting. Never top-navigation.
const VIDEO_SANDBOX = [
  'allow-scripts',
  'allow-same-origin',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-presentation',
] as const;
// Code playgrounds additionally submit forms and open alert/confirm dialogs
// from the user's sandboxed code.
const PLAYGROUND_SANDBOX = [...VIDEO_SANDBOX, 'allow-forms', 'allow-modals'] as const;
const VIDEO_ALLOW = 'fullscreen; picture-in-picture; encrypted-media';
const PLAYGROUND_ALLOW = 'fullscreen; clipboard-write';

const ID = '[A-Za-z0-9_-]+';

/**
 * Canonical embed hosts and paths for built-in providers. Hosts are compared
 * against WHATWG-normalized `URL.hostname` (lowercase, punycode), exactly.
 */
export const EMBED_PROVIDER_RULES: Record<FeatherdownEmbedProvider, ProviderRule> = {
  youtube: {
    hosts: ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com'],
    path: /^\/embed\/(?:[A-Za-z0-9_-]{11}|videoseries)$/,
    sandbox: VIDEO_SANDBOX,
    allow: VIDEO_ALLOW,
  },
  vimeo: {
    hosts: ['player.vimeo.com'],
    path: /^\/video\/\d{1,12}$/,
    sandbox: VIDEO_SANDBOX,
    allow: VIDEO_ALLOW,
  },
  codepen: {
    hosts: ['codepen.io'],
    path: new RegExp(`^/${ID}/embed/(?:preview/)?${ID}$`),
    sandbox: PLAYGROUND_SANDBOX,
    allow: PLAYGROUND_ALLOW,
  },
  codesandbox: {
    hosts: ['codesandbox.io'],
    path: new RegExp(`^/embed/${ID}$`),
    sandbox: PLAYGROUND_SANDBOX,
    allow: PLAYGROUND_ALLOW,
  },
  stackblitz: {
    hosts: ['stackblitz.com'],
    path: new RegExp(`^/edit/${ID}$`),
    check: (url) => url.searchParams.get('embed') === '1',
    sandbox: PLAYGROUND_SANDBOX,
    allow: PLAYGROUND_ALLOW,
  },
};

/**
 * Custom (`allowHosts`) embeds get the same baseline as video players but no
 * Permissions Policy grants. NOTE: `allow-scripts` + `allow-same-origin` is
 * only safe because the frame is cross-origin to the host page; an
 * `allowHosts` entry for the page's own origin would let the frame remove its
 * own sandbox. Hosts must only allowlist third-party origins.
 */
const CUSTOM_SANDBOX = VIDEO_SANDBOX;

const DEFAULT_TITLE = 'Embedded content';
const DIMENSION = /^\d{1,4}%?$/;

/** Normalizes an `allowHosts` entry, or returns `undefined` when it is unusable. */
function normalizeAllowHost(entry: string): { wildcard: boolean; host: string } | undefined {
  let value = entry.trim().toLowerCase();
  let wildcard = false;
  if (value.startsWith('*.')) {
    wildcard = true;
    value = value.slice(2);
  }
  if (!value || /[/@:?#\\*\s[\]]/.test(value)) {
    return undefined;
  }
  let host: string;
  try {
    host = new URL(`https://${value}`).hostname;
  } catch {
    return undefined;
  }
  if (host.endsWith('.') || host.startsWith('.')) return undefined;
  // `*.com`-style wildcards would allow an entire TLD.
  if (wildcard && !host.includes('.')) return undefined;
  return { wildcard, host };
}

function matchesAllowHosts(hostname: string, allowHosts: readonly string[]): boolean {
  for (const entry of allowHosts) {
    const normalized = normalizeAllowHost(entry);
    if (!normalized) continue;
    if (normalized.wildcard) {
      // Subdomains only: never the apex itself.
      if (hostname.length > normalized.host.length + 1 && hostname.endsWith(`.${normalized.host}`)) {
        return true;
      }
    } else if (hostname === normalized.host) {
      return true;
    }
  }
  return false;
}

type Classification = { kind: FeatherdownEmbedProvider | 'custom'; url: URL } | { reason: string };

function classify(src: unknown, config: EmbedConfig): Classification {
  if (typeof src !== 'string' || src.trim() === '') {
    return { reason: 'missing src' };
  }
  let url: URL;
  try {
    // No base: relative and scheme-less URLs are rejected.
    url = new URL(src.trim());
  } catch {
    return { reason: 'invalid src URL' };
  }
  if (url.protocol !== 'https:') return { reason: `protocol ${url.protocol} is not allowed` };
  if (url.username !== '' || url.password !== '') return { reason: 'credentials in src are not allowed' };
  // Default ports normalize to ''; any explicit non-default port is a
  // different service than the allowlisted one.
  if (url.port !== '') return { reason: 'non-default port is not allowed' };
  const hostname = url.hostname;
  if (hostname === '' || hostname.endsWith('.')) return { reason: 'invalid host' };

  for (const provider of config.providers) {
    // Own-property check: never resolve a rule through the prototype chain.
    if (!Object.hasOwn(EMBED_PROVIDER_RULES, provider)) continue;
    const rule = EMBED_PROVIDER_RULES[provider];
    if (!rule.hosts.includes(hostname)) continue;
    if (rule.path.test(url.pathname) && (rule.check?.(url) ?? true)) {
      return { kind: provider, url };
    }
  }
  if (matchesAllowHosts(hostname, config.allowHosts)) {
    return { kind: 'custom', url };
  }
  return { reason: `host ${hostname} is not an allowed embed` };
}

function pickString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.join(' ');
  return undefined;
}

/** Builds the iframe's properties from scratch: author attributes never pass through. */
function hardenedProperties(original: Properties, kind: FeatherdownEmbedProvider | 'custom', url: URL): Properties {
  const title = pickString(original.title)?.replace(/\s+/g, ' ').trim() || DEFAULT_TITLE;
  const properties: Properties = {
    // Serialize what was validated, not the author's string, so the browser
    // cannot parse a different URL than `URL` did.
    src: url.href,
    title,
  };
  const width = pickString(original.width);
  const height = pickString(original.height);
  if (width && DIMENSION.test(width)) properties.width = width;
  if (height && DIMENSION.test(height)) properties.height = height;
  properties.loading = 'lazy';
  properties.referrerPolicy = 'strict-origin-when-cross-origin';
  properties.sandbox = [...(kind === 'custom' ? CUSTOM_SANDBOX : EMBED_PROVIDER_RULES[kind].sandbox)];
  if (kind !== 'custom') {
    properties.allow = EMBED_PROVIDER_RULES[kind].allow;
  }
  properties.allowFullScreen = true;
  return properties;
}

function isWhitespaceText(node: ElementContent | RootContent): boolean {
  return node.type === 'text' && node.value.trim() === '';
}

/**
 * Drops iframes whose `src` is not an allowed provider/host and hardens the rest.
 *
 * Runs immediately after `rehype-sanitize`. The sanitize schema is fixed per
 * cached processor, so the per-parse allowlist is enforced here from the vfile
 * (`getPipelineContext(file)?.config?.embeds`). Missing config fails closed.
 * Allowed iframes are rebuilt from a whitelist (so this is safe even with
 * `sanitize: false`) and wrapped in `div.embed.embed-<provider|custom>`.
 */
export default function rehypeEmbeds() {
  return (tree: Root, file: VFile): undefined => {
    const context = getPipelineContext(file);
    const embeds = context?.config?.embeds;
    // Fail closed: no per-parse config (or a disabled one) drops every iframe.
    const config = embeds?.enabled === true ? embeds : undefined;

    const block = (reason: string): void => {
      context?.emitDiagnostic?.({
        code: 'embeds.blocked',
        message: `Removed iframe: ${reason}.`,
        severity: 'warning',
        source: 'embeds',
      });
    };

    const walk = (parent: Root | Element): void => {
      for (let index = parent.children.length - 1; index >= 0; index--) {
        const child = parent.children[index];
        if (!child || child.type !== 'element') continue;
        if (child.tagName !== 'iframe') {
          walk(child);
          continue;
        }

        const result = config ? classify(child.properties.src, config) : { reason: 'embeds are not configured' };
        if ('reason' in result) {
          block(result.reason);
          parent.children.splice(index, 1);
          continue;
        }

        const iframe: Element = {
          type: 'element',
          tagName: 'iframe',
          properties: hardenedProperties(child.properties, result.kind, result.url),
          children: [],
        };
        const wrapper: Element = {
          type: 'element',
          tagName: 'div',
          properties: { className: ['embed', `embed-${result.kind}`] },
          children: [iframe],
        };

        // An iframe alone in a paragraph (e.g. inline raw HTML) replaces the
        // paragraph, so we do not emit an invalid `p > div`.
        if (
          parent.type === 'element' &&
          parent.tagName === 'p' &&
          parent.children.every((node) => node === child || isWhitespaceText(node))
        ) {
          parent.tagName = 'div';
          parent.properties = wrapper.properties;
          parent.children = [iframe];
          return;
        }
        parent.children.splice(index, 1, wrapper);
      }
    };

    walk(tree);
  };
}
