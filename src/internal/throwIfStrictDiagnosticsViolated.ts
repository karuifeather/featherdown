import { FeatherdownDiagnosticsError } from '../featherdownDiagnosticsError.js';
import type { FeatherdownResult } from '../types.js';
import type { ResolvedFeatherdownOptions } from './resolveFeatherdownOptions.js';

/**
 * When diagnostics mode is `"strict"`, throws if any diagnostics were collected.
 * Call after {@link buildFeatherdownResult} so visibility rules already applied.
 */
export function throwIfStrictDiagnosticsViolated(
  resolved: ResolvedFeatherdownOptions,
  result: FeatherdownResult,
): void {
  if (resolved.diagnostics.mode !== 'strict' || result.diagnostics.length === 0) {
    return;
  }
  throw new FeatherdownDiagnosticsError(result.diagnostics, result);
}
