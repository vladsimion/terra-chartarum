#!/usr/bin/env node
/**
 * lighthouse
 *
 * Runs Lighthouse CI against ./dist with the assertions in lighthouserc.json -
 * the same gate CI enforces, where performance >= 0.9 on / and /essays/ is a
 * hard error rather than a warning.
 *
 * lhci needs a Chrome binary and finds one only if Chrome is installed
 * system-wide, so on a machine without it `npx lhci autorun` fails its
 * healthcheck with "Chrome installation not found" and the budget cannot be
 * checked before pushing. This resolves a browser first - an explicit
 * CHROME_PATH, then a system Chrome, then the chromium Playwright already
 * installs for the e2e suite - and hands it to lhci via CHROME_PATH.
 *
 *   npm run build && npm run lighthouse
 */
import { existsSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Candidate system installs, in the order lhci itself would prefer them. */
const SYSTEM_CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

/**
 * Playwright's browsers live in a versioned cache, and the layout differs
 * between the full chromium build and the headless shell. Scan for either
 * rather than pinning a build number that will drift.
 */
function playwrightChromium() {
  const cache =
    process.env.PLAYWRIGHT_BROWSERS_PATH ||
    (process.platform === 'darwin'
      ? join(homedir(), 'Library', 'Caches', 'ms-playwright')
      : join(homedir(), '.cache', 'ms-playwright'));
  if (!existsSync(cache)) return null;

  const candidates = [];
  for (const entry of readdirSync(cache)) {
    if (!entry.startsWith('chromium')) continue;
    candidates.push(
      join(cache, entry, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
      join(cache, entry, 'chrome-linux', 'chrome'),
      join(cache, entry, 'chrome-headless-shell-mac-x64', 'chrome-headless-shell'),
      join(cache, entry, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'),
      join(cache, entry, 'chrome-headless-shell-linux', 'chrome-headless-shell'),
    );
  }
  return candidates.find((path) => existsSync(path)) ?? null;
}

function resolveChrome() {
  if (process.env.CHROME_PATH) {
    if (existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
    console.error(`CHROME_PATH is set but does not exist: ${process.env.CHROME_PATH}`);
    process.exit(1);
  }
  return SYSTEM_CHROME.find((path) => existsSync(path)) ?? playwrightChromium();
}

const chrome = resolveChrome();
if (!chrome) {
  console.error(
    'No Chrome binary found.\n' +
      'Install Chrome, or install the browser the e2e suite already uses:\n' +
      '  npx playwright install chromium',
  );
  process.exit(1);
}

if (!existsSync('dist')) {
  console.error('No ./dist to audit. Run `npm run build` first.');
  process.exit(1);
}

console.log(`Lighthouse CI using: ${chrome}\n`);
const result = spawnSync('npx', ['lhci', 'autorun', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, CHROME_PATH: chrome },
});
process.exit(result.status ?? 1);
