// Flat ESLint config (KAN-176). Lints the TypeScript + Astro source that the
// portal ships; the legacy essays under public/embed are preserved verbatim and
// deliberately excluded, as are build artifacts and generated bundles.
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default tseslint.config(
  {
    ignores: [
      'dist/',
      '.astro/',
      'node_modules/',
      'public/',
      'starter/',
      'playwright-report/',
      'test-results/',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    rules: {
      // Astro components legitimately use `any` at the astro:content boundary;
      // keep the type-safety signal as a warning rather than a hard failure.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Node-context tooling scripts use console + process freely.
    files: ['scripts/**/*.{js,mjs}', '*.config.{js,mjs,ts}'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly', Buffer: 'readonly' },
    },
  },
  {
    // Astro generates env.d.ts with a triple-slash reference by design.
    files: ['src/env.d.ts'],
    rules: { '@typescript-eslint/triple-slash-reference': 'off' },
  },
);
