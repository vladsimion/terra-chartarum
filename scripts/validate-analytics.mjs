/**
 * Asserts the state of the *Plausible* integration in the built HTML.
 *
 * Scope warning: the site's active provider is Cloudflare Web Analytics, which
 * Cloudflare Pages injects at the edge on deploy. That script never appears in
 * dist/, so `--expect=disabled` passing here means "no Plausible snippet was
 * built in" - it is NOT evidence that the site is unmeasured. See
 * docs/analytics-privacy.md.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = resolve(ROOT, 'dist');
const expected = process.argv.find((argument) => argument.startsWith('--expect='))?.split('=')[1];

if (!['enabled', 'disabled'].includes(expected)) {
  console.error('Usage: npm run analytics:validate -- --expect=enabled|disabled');
  process.exit(2);
}

function htmlFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    return statSync(path).isDirectory() ? htmlFiles(path) : path.endsWith('.html') ? [path] : [];
  });
}

const pages = htmlFiles(DIST);
const failures = [];
for (const page of pages) {
  // Preserved legacy essays are raw standalone documents inside same-origin
  // iframes. Tracking them would double-count the PortalLayout pageview.
  if (page.replaceAll('\\', '/').includes('/embed/')) continue;
  const html = readFileSync(page, 'utf8');
  const hasProvider = html.includes('data-analytics-provider="plausible"');
  const hasMarker = html.includes('name="tc-analytics"');
  const hasInit = html.includes('plausible.init(');
  const minimal =
    html.includes('captureOnLocalhost:false') &&
    html.includes('fileDownloads:false') &&
    html.includes('outboundLinks:false') &&
    html.includes('formSubmissions:false') &&
    html.includes('customProperties:{}');

  if (expected === 'enabled' && !(hasProvider && hasMarker && hasInit && minimal)) {
    failures.push(`${page}: enabled analytics markup is incomplete`);
  }
  if (expected === 'disabled' && (hasProvider || hasMarker || hasInit)) {
    failures.push(`${page}: analytics markup is present in a disabled build`);
  }
}

if (failures.length > 0) {
  console.error(`Analytics QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Analytics QA passed: ${pages.length} page(s), expected ${expected}.`);
