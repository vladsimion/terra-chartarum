import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Unit tests (KAN-176). Scoped to co-located *.test.ts under src/; the Playwright
// end-to-end specs live in e2e/ and are excluded so the two runners never collide.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      // The registries validate their data at module load with `z` from the
      // `astro:content` virtual module. Vitest has no Astro runtime, so point it
      // at a shim that re-exports zod (see src/test-support/astro-content-shim.ts).
      'astro:content': fileURLToPath(
        new URL('./src/test-support/astro-content-shim.ts', import.meta.url),
      ),
    },
  },
});
