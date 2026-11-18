import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type ExportMap = Record<string, unknown>;

const readJson = (file: string): { exports: ExportMap } =>
  JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')) as { exports: ExportMap };

/** Map an npm `exports` target (`./dist/x.js`) to the TS source JSR serves (`./src/x.ts`). */
function npmTargetToSource(target: unknown): string | undefined {
  const entry =
    typeof target === 'string'
      ? target
      : (target as { import?: string } | undefined)?.import;
  if (!entry?.startsWith('./dist/') || !entry.endsWith('.js')) {
    return undefined;
  }
  return entry.replace('./dist/', './src/').replace(/\.js$/, '.ts');
}

describe('JSR / npm export parity', () => {
  const npm = readJson('package.json').exports;
  const deno = readJson('deno.json').exports;

  it('exposes every npm JavaScript subpath on JSR with the matching source file', () => {
    const jsSubpaths = Object.entries(npm)
      .map(([subpath, target]) => [subpath, npmTargetToSource(target)] as const)
      .filter((pair): pair is readonly [string, string] => pair[1] !== undefined);

    expect(jsSubpaths.map(([subpath]) => subpath)).toEqual(['.', './node', './advanced', './legacy']);
    for (const [subpath, source] of jsSubpaths) {
      expect(deno[subpath], `deno.json exports["${subpath}"]`).toBe(source);
    }
  });
});
