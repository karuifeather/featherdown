import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import packageJson from '../package.json' with { type: 'json' };

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const root = await import('../dist/index.js');
const nodeOnly = await import('../dist/node.js');
const advanced = await import('../dist/advanced.js');

/** Primary public classes — root and node entries */
assert.equal(typeof root.Featherdown, 'function');
assert.equal(typeof root.FeatherdownDiagnosticsError, 'function');
assert.equal(typeof nodeOnly.Featherdown, 'function');
assert.equal(typeof nodeOnly.FeatherdownDiagnosticsError, 'function');

/** Advanced subpath — low-level processor and rehype plugins */
assert.equal(typeof advanced.createMarkdownProcessor, 'function');
assert.equal(typeof advanced.rehypeChartBlocks, 'function');
assert.equal(typeof advanced.rehypeCdnImages, 'function');

assert.equal(typeof root.renderMarkdownToHtml, 'function');
assert.equal(typeof root.renderMarkdown, 'function');
assert.equal(typeof root.renderMarkdownDocument, 'function');
assert.equal(typeof root.createMarkdownProcessor, 'function');
assert.equal(typeof root.rehypeChartBlocks, 'function');
assert.equal(typeof root.rehypeCdnImages, 'function');
assert.equal(typeof root.parseMarkdownFile, 'function');

assert.equal(typeof nodeOnly.renderMarkdownToHtmlWithMermaid, 'function');
assert.equal(typeof new nodeOnly.Featherdown().parse, 'function');
assert.equal(typeof new nodeOnly.Featherdown().parseFile, 'function');

const distDir = join(repoRoot, 'dist');
const distJsFiles = (await readdir(distDir)).filter((f) => f.endsWith('.js'));
let browserBundle = '';
for (const f of distJsFiles) {
  if (f === 'node.js') continue;
  browserBundle += await readFile(join(distDir, f), 'utf8');
}

const rootCode = await readFile(join(distDir, 'index.js'), 'utf8');
const nodeCode = await readFile(join(distDir, 'node.js'), 'utf8');
const advancedCode = await readFile(join(distDir, 'advanced.js'), 'utf8');

const forbiddenInBrowserBundle = ['rehype-mermaid', 'playwright', 'node:fs', 'chromium'];
for (const needle of forbiddenInBrowserBundle) {
  assert.equal(
    browserBundle.includes(needle),
    false,
    `Browser-oriented dist/**/*.js (excluding node.js) must not include "${needle}".`,
  );
}

assert.equal(
  advancedCode.includes('rehype-mermaid') || advancedCode.includes('playwright'),
  false,
  'Advanced entry must stay free of Mermaid/Playwright paths.',
);
assert.equal(
  nodeCode.includes('rehype-mermaid'),
  true,
  'Node-only entry should include Mermaid integration.',
);

assert.equal(
  root.libraryId(),
  'featherdown',
  'Public package entry should resolve and execute correctly.',
);

const featherdown = new root.Featherdown();
assert.equal(typeof featherdown.parse, 'function');

const requiredRootNamedExports = [
  'Featherdown',
  'FeatherdownDiagnosticsError',
  'libraryId',
  'renderMarkdownToHtml',
  'renderMarkdown',
  'renderMarkdownDocument',
  'parseMarkdownFile',
  'createMarkdownProcessor',
  'rehypeChartBlocks',
  'rehypeCdnImages',
];
for (const name of requiredRootNamedExports) {
  assert.ok(
    name in root && root[name] !== undefined,
    `dist/index.js must export "${name}" for public compatibility.`,
  );
}

const requiredNodeNamedExports = [
  'Featherdown',
  'FeatherdownDiagnosticsError',
  'renderMarkdownToHtmlWithMermaid',
];
for (const name of requiredNodeNamedExports) {
  assert.ok(name in nodeOnly && nodeOnly[name] !== undefined, `dist/node.js must export "${name}".`);
}

const requiredAdvancedNamedExports = ['createMarkdownProcessor', 'rehypeChartBlocks', 'rehypeCdnImages'];
for (const name of requiredAdvancedNamedExports) {
  assert.ok(name in advanced && advanced[name] !== undefined, `dist/advanced.js must export "${name}".`);
}

/** @param {unknown} exportEntry */
function exportTargetPath(exportEntry) {
  if (typeof exportEntry === 'string') {
    return exportEntry;
  }
  if (exportEntry && typeof exportEntry === 'object') {
    const o = /** @type {{ import?: string; default?: string }} */ (exportEntry);
    return o.import ?? o.default ?? '';
  }
  return '';
}

/**
 * Whether `sideEffects` globs cover a published CSS file path (e.g. `./styles/base.css`).
 * @param {string} targetPath
 * @param {string[]} sideEffects
 */
function cssPathCoveredBySideEffects(targetPath, sideEffects) {
  const rel = targetPath.replace(/^\.\//, '');
  for (const pattern of sideEffects) {
    if (pattern === '*.css' && !rel.includes('/') && rel.endsWith('.css')) {
      return true;
    }
    if (pattern === 'styles/**/*.css' && rel.startsWith('styles/') && rel.endsWith('.css')) {
      return true;
    }
    if (pattern === './' + rel || pattern === rel) {
      return true;
    }
  }
  return false;
}

const cssExportEntries = Object.entries(packageJson.exports).filter(([key]) => key.endsWith('.css'));

const expectedCssExportKeys = [
  './styles.css',
  './styles/base.css',
  './styles/katex.css',
  './styles/code.css',
  './styles/highlight.css',
];

for (const key of expectedCssExportKeys) {
  assert.ok(key in packageJson.exports, `package.json exports must include ${key}`);
  const val = packageJson.exports[key];
  assert.equal(
    exportTargetPath(val),
    key,
    `export ${key} should resolve to the matching filesystem path`,
  );
}

for (const [exportKey, exportVal] of cssExportEntries) {
  const target = exportTargetPath(exportVal);
  assert.ok(target.endsWith('.css'), `Export ${exportKey} should resolve to a .css file`);
  assert.ok(
    cssPathCoveredBySideEffects(target, packageJson.sideEffects),
    `sideEffects must cover published CSS ${target} (export key ${exportKey})`,
  );
  const abs = join(repoRoot, target.replace(/^\.\//, ''));
  await access(abs);
}

const styleCode = await readFile(join(repoRoot, 'styles.css'), 'utf8');
const baseCss = await readFile(join(repoRoot, 'styles/base.css'), 'utf8');
const katexCss = await readFile(join(repoRoot, 'styles/katex.css'), 'utf8');
const codeCss = await readFile(join(repoRoot, 'styles/code.css'), 'utf8');
const highlightCss = await readFile(join(repoRoot, 'styles/highlight.css'), 'utf8');

assert.equal(styleCode.trim().length > 0, true, 'Official stylesheet should be published and non-empty.');
assert.ok(styleCode.includes('@import'), 'Root styles.css should aggregate sub-styles.');
for (const sub of ['./styles/base.css', './styles/katex.css', './styles/code.css', './styles/highlight.css']) {
  assert.ok(
    styleCode.includes(sub),
    `Root styles.css should import ${sub}`,
  );
}

assert.ok(baseCss.includes('.featherdown-content'), 'base.css should define content contracts.');
assert.ok(
  katexCss.includes('katex/dist/katex.min.css'),
  'katex.css should @import the KaTeX distribution stylesheet.',
);
assert.ok(
  katexCss.toLowerCase().includes('bundler'),
  'katex.css should document bundler-oriented usage.',
);
assert.ok(codeCss.includes('.code-block'), 'code.css should define Featherdown code-block chrome.');
assert.ok(
  !codeCss.includes('highlight.js'),
  'code.css must not import highlight.js; that belongs in highlight.css.',
);
assert.ok(
  highlightCss.includes('highlight.js/styles/github.min.css'),
  'highlight.css should import the default highlight.js theme.',
);

const packOutput = execSync('npm pack --dry-run 2>&1', {
  cwd: repoRoot,
  encoding: 'utf8',
});
const packRequiredPaths = [
  'dist/index.js',
  'dist/index.d.ts',
  'dist/node.js',
  'dist/node.d.ts',
  'dist/advanced.js',
  'dist/advanced.d.ts',
  'styles.css',
  'styles/base.css',
  'styles/katex.css',
  'styles/code.css',
  'styles/highlight.css',
  'README.md',
  'package.json',
];
for (const p of packRequiredPaths) {
  assert.ok(
    packOutput.includes(p),
    `npm pack --dry-run tarball should include ${p}`,
  );
}

console.log('Export smoke checks passed.');
