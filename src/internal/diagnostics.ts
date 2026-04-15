import type { RenderDiagnostic } from '../types.js';

export type DiagnosticEmitter = (d: RenderDiagnostic) => void;

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

