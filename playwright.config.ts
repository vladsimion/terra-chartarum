import { defineConfig, devices } from '@playwright/test';

import { previewPort } from './e2e/preview-port';

// End-to-end tests (KAN-176). Playwright builds the static site and serves the
// production `dist/` (matching what ships), then runs smoke + axe a11y checks.
//
// Cross-browser / responsive QA (KAN-54 / ATLAS-603): the core user flows in
// `flows.spec.ts` run on every engine and on two mobile viewports; the heavier
// axe + keyboard-focus suite in `smoke.spec.ts` stays chromium-only (a11y and
// focus semantics are engine-independent and needn't pay the ×5 cost).
// The port is derived per checkout so a server from another worktree - or the
// dev server on 4321 - can never be reused in place of this one's build. See
// e2e/preview-port.ts. Release scrubs still set PLAYWRIGHT_PORT to force a fresh
// build on a port they name.
const PORT = previewPort('default', process.env.PLAYWRIGHT_PORT);

// Non-chromium projects only run the browser-agnostic core-flow spec.
const CROSS_BROWSER_TESTS = /flows\.spec\.ts/;

export default defineConfig({
  testDir: './e2e',
  // The held-essay preview needs a build with SHOW_UNRELEASED=1 and has its own
  // config and port. Running it here would check a page against a build whose
  // whole purpose is to lift the hold this suite proves. See
  // playwright.held.config.ts.
  testIgnore: /held-preview\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    // Full suite: smoke + axe + keyboard + core flows.
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Core flows only, across the other engines and mobile viewports.
    {
      name: 'firefox',
      testMatch: CROSS_BROWSER_TESTS,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: CROSS_BROWSER_TESTS,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      testMatch: CROSS_BROWSER_TESTS,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      testMatch: CROSS_BROWSER_TESTS,
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    // Test the real built output, not the dev server.
    command: 'npm run build && npm run preview -- --port ' + PORT,
    port: PORT,
    reuseExistingServer: !process.env.CI && !process.env.PLAYWRIGHT_PORT,
    timeout: 120_000,
  },
});
