import { defineConfig } from 'vitest/config';

// Unit tests (KAN-176). Scoped to co-located *.test.ts under src/; the Playwright
// end-to-end specs live in e2e/ and are excluded so the two runners never collide.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
