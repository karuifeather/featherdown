import type { MarkdownProcessorFeatureGates } from './createMarkdownProcessorInternal.js';
import type { PipelineFeatureConfig } from './pipelineContext.js';
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
    alerts: resolved.alerts,
    details: resolved.details,
    subSuperscript: resolved.subSuperscript,
    definitionLists: resolved.definitionLists,
    tabs: resolved.tabs,
    links: resolved.links.enabled,
    images: resolved.images.enabled,
    embeds: resolved.embeds.enabled,
  };
}

export function toPipelineFeatureConfig(resolved: ResolvedFeatherdownOptions): PipelineFeatureConfig {
  return {
    code: { lineNumbers: resolved.code.lineNumbers, copyButton: resolved.code.copyButton },
    links: resolved.links,
    images: resolved.images,
    embeds: resolved.embeds,
    math: { macros: resolved.math.macros, trust: resolved.math.trust, strict: resolved.math.strict },
  };
}
