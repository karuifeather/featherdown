/**
 * Utility entrypoint for package identity checks.
 *
 * Exports a stable library identifier used in diagnostics and smoke tests.
 */

/**
 * Stable identifier for this library. Intended for diagnostics and smoke tests.
 */
export function libraryId(): string {
  return 'featherdown';
}
