import { defineConfig, devices } from '@playwright/test';

import { previewPort } from './e2e/preview-port';

/**
 * Held-essay preview QA (ANT-13 / KAN-432).
 *
 * The TERRA INCOGNITA essay is held, so its route 404s in an ordinary build and
 * the accessibility, mobile-layout and deep-link work that lives on that page
 * has nowhere to be checked. KAN-424 and KAN-429 recorded all three as
 * unverified for exactly that reason.
 *
 * They do not have to stay unverified. `SHOW_UNRELEASED=1` is the authoring
 * escape hatch (`src/lib/release.ts`) and it renders the whole collection, so
 * this config builds that variant on its own port and runs the checks against
 * the real page. What it proves is narrow and worth being precise about: the
 * page is accessible, usable on a phone and correctly wired *when it ships*.
 * It says nothing about whether it should ship - that is the review gate, and
 * no browser can close it.
 *
 * Kept as a separate config rather than a project, because the two need
 * different builds of the site and Playwright starts one web server per config.
 * `playwright.config.ts` ignores this spec so the ordinary suite - which proves
 * the hold is real - is never run against a build that lifts it.
 */
// Derived per checkout, for the reasons in e2e/preview-port.ts: 4331 is the port
// the mobile-QA instructions run a manual `astro preview` on, and reusing that
// would check the held pages against a build made without SHOW_UNRELEASED=1 -
// the exact hold this suite exists to prove.
const PORT = previewPort('held', process.env.PLAYWRIGHT_HELD_PORT);

export default defineConfig({
  testDir: './e2e',
  testMatch: /held-preview\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // The phone viewport is the point of half these checks, not a bonus pass.
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: `SHOW_UNRELEASED=1 npm run build && npm run preview -- --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
