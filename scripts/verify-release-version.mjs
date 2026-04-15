/**
 * Ensures GITHUB_REF_NAME (e.g. v1.2.3) matches package.json and deno.json versions.
 * Used by the release workflow; can be run locally: GITHUB_REF_NAME=v1.0.0 node scripts/verify-release-version.mjs
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

const tag = process.env.GITHUB_REF_NAME ?? '';
const m = /^v(\d+\.\d+\.\d+)$/.exec(tag);
if (!m) {
  console.error(
    `Expected GITHUB_REF_NAME like v1.2.3 (semver x.y.z), got: ${JSON.stringify(tag)}`,
  );
  process.exit(1);
}

const version = m[1];
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const deno = JSON.parse(readFileSync(new URL('../deno.json', import.meta.url)));

if (pkg.version !== version) {
  console.error(
    `package.json version "${pkg.version}" does not match tag "${version}".`,
  );
  process.exit(1);
}

if (deno.version !== version) {
  console.error(
    `deno.json version "${deno.version}" does not match tag "${version}".`,
  );
  process.exit(1);
}

console.log(`Release version ${version} matches package.json and deno.json.`);
