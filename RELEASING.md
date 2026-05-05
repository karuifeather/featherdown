# Releasing

This document describes continuous integration, automated releases, and one-time registry setup for maintainers.

## Continuous integration

The [CI workflow](.github/workflows/ci.yml) runs on every push and pull request. It calls a shared [validation workflow](.github/workflows/validate-reusable.yml) that:

- installs dependencies with `npm ci`
- installs Playwright Chromium (`npx playwright install --with-deps chromium`) so Mermaid-related tests can run
- runs `npm run build`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run test:exports`, and `npm pack --dry-run`

Node.js 22 is used in CI (the package requires Node.js 18 or newer).

## Release trigger

The [release workflow](.github/workflows/release.yml) runs when a version tag is pushed:

- Pattern: `vMAJOR.MINOR.PATCH` (for example `v0.2.0`)

It runs the same validation as CI, then checks that:

- `GITHUB_REF_NAME` (the tag) matches `package.json` `version`
- the same version appears in `deno.json` (JSR metadata)

If that check passes, it publishes in order: **npm first**, then **JSR only if npm succeeds** (OIDC for both; no long-lived tokens in the workflow file).

Update versions in both `package.json` and `deno.json` before tagging. To verify locally:

```bash
GITHUB_REF_NAME=v0.1.1 node scripts/verify-release-version.mjs
```

## One-time setup: npm trusted publishing

1. On [npmjs.com](https://www.npmjs.com/), open the package **Access** / **Publishing** settings for `featherdown`.
2. Under **Trusted publishers**, add **GitHub Actions** for this repository and the workflow file **`release.yml`** (exact name and path as in this repo).
3. Ensure `package.json` includes a correct `repository` URL for this GitHub repo (used for provenance and publisher matching).

Publishing uses OpenID Connect (`id-token: write` in the workflow). Do not add a classic `NPM_TOKEN` secret for this flow.

If the npm job fails after fixing configuration, re-run the failed workflow once the npm settings match the repository and workflow name.

Action runtime deprecation notices in the job log are separate from publish failures: read the **Publish to npm** step output for the npm error (trusted publisher mismatch, wrong workflow filename, version already on the registry, and so on).

## One-time setup: JSR and GitHub

1. Create or select the JSR scope and package (for example `@karuifeather/featherdown` as in `deno.json`).
2. In the package **Settings** on [jsr.io](https://jsr.io/), **link** the GitHub repository that hosts this code.
3. Ensure maintainers who publish are members of the JSR scope with publish permission.

JSR publishing from GitHub Actions uses OIDC (`id-token: write`). Do not add a `JSR_TOKEN` secret when using this linked flow.

The JSR surface is defined only in `deno.json` exports (browser-safe / default library API). The npm-only `featherdown/node` Mermaid subpath remains outside JSR; that boundary is unchanged.

## Release procedure

1. Confirm `main` is green (CI passing).
2. Bump `version` in **`package.json`** and **`deno.json`** to the same semver.
3. Commit the version bump (and any release notes you maintain). End-user migration for the Featherdown-first API is documented in **README.md** under **Migration from legacy helpers**; there is no separate changelog file—use the tag message or GitHub release notes for semver highlights when helpful.
4. Create and push an annotated tag, for example:

   ```bash
   git tag -a v0.2.0 -m "v0.2.0"
   git push origin v0.2.0
   ```

5. Watch the **Release** workflow: validation, then tag/version check, then npm, then JSR.

## If a publish fails partway

- **Validation or tag/version check failed:** Nothing is published to npm or JSR. Fix the issue (code, versions, or tag), push commits as needed, and use a **new tag** after bumping versions if the failed tag should not be reused.
- **npm publish failed:** JSR is not attempted. Fix npm (trusted publisher settings, package metadata, or transient errors), then re-run the failed **Release** workflow job or publish that version to npm manually if appropriate.
- **npm succeeded, JSR failed:** npm already has this version; JSR does not. Fix JSR (repo link, scope permissions, `deno.json`, or transient errors), then use **Re-run failed jobs** on that workflow run so only **Publish to JSR** retries (a full re-run from scratch will usually fail at npm with “version already exists,” so JSR will not run). Alternatively run `npx jsr publish` locally (browser login) for that tag’s commit.
