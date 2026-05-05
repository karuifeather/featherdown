import eslint from '@eslint/js';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const configDir = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'site/**',
      'eslint.config.js',
      'scripts/**',
      'test/exports.smoke.mjs',
      'npm-smoke-test/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: configDir,
      },
    },
  },
  {
    files: ['src/renderMarkdown.ts', 'src/renderMarkdownToHtml.ts'],
    rules: {
      // These modules intentionally delegate to `renderMarkdownDocument`, which is also marked @deprecated.
      '@typescript-eslint/no-deprecated': 'off',
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      // Tests intentionally exercise legacy compatibility APIs marked @deprecated.
      '@typescript-eslint/no-deprecated': 'off',
    },
  },
  {
    files: ['src/index.ts', 'src/advanced.ts'],
    rules: {
      // Barrel files re-export compatibility APIs that carry their own @deprecated JSDoc.
      '@typescript-eslint/no-deprecated': 'off',
    },
  },
);
