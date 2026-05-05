import type { MarkdownProcessorFeatureGates } from './createMarkdownProcessorInternal.js';
import type { ResolvedFeatherdownOptions } from './resolveFeatherdownOptions.js';
import type { FeatherdownOptions, RenderMarkdownOptions } from '../types.js';

export function pickRenderMarkdownOptions(merged: FeatherdownOptions | undefined): RenderMarkdownOptions | undefined {
  if (!merged) {
    return undefined;
  }
  const { kind, slug, manifest } = merged;
  if (kind === undefined && slug === undefined && manifest === undefined) {
    return undefined;
  }
  const r: RenderMarkdownOptions = {};
  if (kind !== undefined) {
    r.kind = kind;
  }
  if (slug !== undefined) {
    r.slug = slug;
  }
  if (manifest !== undefined) {
    r.manifest = manifest;
  }
  return r;
}

export function toProcessorGates(resolved: ResolvedFeatherdownOptions): MarkdownProcessorFeatureGates {
  return {
    math: resolved.math.enabled,
    code: resolved.code.enabled,
    codeHighlighting: resolved.code.enabled && resolved.code.highlighting,
    charts: resolved.charts,
    sanitize: resolved.sanitize,
  };
}
