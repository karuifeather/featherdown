import type { RenderMarkdownOptions } from '../types.js';
import type { DiagnosticEmitter } from './diagnostics.js';

/**
 * Per-parse state that plugins read from the vfile instead of from plugin
 * options. Keeping it off the processor lets one frozen processor be cached
 * and reused (including concurrently) across parses.
 */
export type PipelineContext = RenderMarkdownOptions & {
  emitDiagnostic?: DiagnosticEmitter;
};

const KEY = 'featherdown';

type FileLike = { data: unknown };

export function setPipelineContext(file: FileLike, context: PipelineContext): void {
  (file.data as Record<string, unknown>)[KEY] = context;
}

export function getPipelineContext(file: FileLike | undefined): PipelineContext | undefined {
  if (!file) {
    return undefined;
  }
  return (file.data as Record<string, unknown>)[KEY] as PipelineContext | undefined;
}
