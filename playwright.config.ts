import { defineConfig, devices } from '@playwright/test';

// End-to-end tests (KAN-176). Playwright builds the static site and serves the
// production `dist/` (matching what ships), then runs smoke + axe a11y checks.
const PORT = 4321;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Test the real built output, not the dev server.
    command: 'npm run build && npm run preview -- --port ' + PORT,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
