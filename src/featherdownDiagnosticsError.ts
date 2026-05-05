import type { FeatherdownResult, RenderDiagnostic } from './types.js';

/**
 * Thrown when {@link FeatherdownOptions.diagnostics} is `"strict"` and the
 * render pipeline produced one or more {@link RenderDiagnostic} entries.
 */
export class FeatherdownDiagnosticsError extends Error {
  override readonly name = 'FeatherdownDiagnosticsError';

  readonly diagnostics: RenderDiagnostic[];

  /**
   * Full parse result as built before the strict check, including `html` and
   * the same `diagnostics` array as {@link FeatherdownDiagnosticsError.diagnostics}.
   * Omitted when the error is constructed without a result (internal use only).
   */
  readonly result: FeatherdownResult | undefined;

  constructor(diagnostics: RenderDiagnostic[], result?: FeatherdownResult) {
    super(`Featherdown strict diagnostics failed with ${String(diagnostics.length)} diagnostic(s).`);
    this.diagnostics = diagnostics;
    this.result = result;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
