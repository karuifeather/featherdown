import type { RenderDiagnostic } from '../types.js';

/**
 * Emits a non-fatal rendering diagnostic.
 */
export type DiagnosticEmitter = (d: RenderDiagnostic) => void;

/**
 * Create a collector used to accumulate diagnostics during rendering.
 */
export function createDiagnosticCollector() {
  const diagnostics: RenderDiagnostic[] = [];
  const emit: DiagnosticEmitter = (d) => {
    diagnostics.push(d);
  };

  return {
    emit,
    diagnostics,
  };
}

