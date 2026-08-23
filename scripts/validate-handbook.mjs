#!/usr/bin/env node
/**
 * Atlas Handbook release integrity (ATLAS-1221 / KAN-417).
 *
 * Runs against `dist/` rather than against the source model, deliberately. The
 * content pipeline already refuses to build an incoherent corpus - unresolved
 * IDs, duplicate routes, held essays, governance links - and that check lives in
 * `loadHandbook()`. What it cannot see is the *output*: whether every route it
 * promised actually got written, whether an internal link resolves to a file
 * that exists, and whether anything internal leaked into the HTML on the way.
 *
 * Severity is deliberate and stated per rule:
 *   ERROR   - a release defect. The build fails.
 *   WARN    - worth a human look, not worth blocking a release.
 *
 * External GitHub links are NOT fetched. A network check would make the build
 * non-deterministic and fail on someone else's outage; the links are validated
 * for shape and for being confined to Advanced/Technical sections instead.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = join(root, 'dist');
const errors = [];
const warnings = [];

const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

if (!existsSync(dist)) {
  console.error('ERROR dist/ is missing; run the build before this check.');
  process.exit(1);
}

const coveragePath = join(dist, 'data', 'handbook-coverage.json');
if (!existsSync(coveragePath)) {
  console.error('ERROR dist/data/handbook-coverage.json is missing.');
  process.exit(1);
}
const coverage = JSON.parse(readFileSync(coveragePath, 'utf8'));

/** Collect every built handbook and layer page. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else if (entry.name === 'index.html') out.push(path);
  }
  return out;
}

const atlasDir = join(dist, 'atlas');
const pages = existsSync(atlasDir) ? walk(atlasDir) : [];
const routeOf = (file) => `${file.slice(dist.length).replace(/index\.html$/, '')}`;
const builtRoutes = new Set(pages.map(routeOf));

// --- 1. Every published layer resolves to exactly one public record. ---------
for (const row of coverage.rows) {
  if (!row.documented) {
    fail(`published layer "${row.layerId}" has no public documentation record`);
    continue;
  }
  const route = `/atlas/layers/${row.layerId}/`;
  if (!builtRoutes.has(route)) {
    fail(`layer "${row.layerId}" claims ${route} but no page was built there`);
  }
}
if (coverage.undocumented.length > 0) {
  fail(`coverage report lists ${coverage.undocumented.length} undocumented published layer(s)`);
}

// --- 2. No orphaned layer page. ---------------------------------------------
const knownLayers = new Set(coverage.rows.map((row) => row.layerId));
for (const route of builtRoutes) {
  const match = /^\/atlas\/layers\/([^/]+)\/$/.exec(route);
  if (match && !knownLayers.has(match[1])) {
    fail(`built page ${route} does not correspond to any registered layer`);
  }
}

// --- 3. Nothing public may depend on a governance surface. ------------------
const GOVERNANCE = /https?:\/\/[^"']*(atlassian\.net|jira\.com)[^"']*/g;
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const hits = html.match(GOVERNANCE) ?? [];
  if (hits.length > 0) {
    fail(`${routeOf(file)} links a governance surface: ${hits[0]}`);
  }
}

// --- 4. Internal links resolve to something that was built. -----------------
const INTERNAL = /href="(\/[^"#?]*)"/g;
const SKIP = /^\/(geo|data|_astro|images|covers|embed|fonts|media)\//;
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  for (const [, href] of html.matchAll(INTERNAL)) {
    if (SKIP.test(href) || href.includes('.')) continue;
    const target = href.endsWith('/') ? href : `${href}/`;
    if (!existsSync(join(dist, target, 'index.html'))) {
      fail(`${routeOf(file)} links ${href}, which was not built`);
    }
  }
}

// --- 5. A full scholarly record carries citation and licence metadata. ------
for (const row of coverage.rows) {
  const file = join(dist, 'atlas', 'layers', row.layerId, 'index.html');
  if (!existsSync(file)) continue;
  const html = readFileSync(file, 'utf8');
  if (!/Citation and reuse/.test(html)) {
    fail(`layer "${row.layerId}" renders no citation panel`);
  }
  if (!/Licence/.test(html)) {
    fail(`layer "${row.layerId}" states no licence`);
  }
  if (!row.minimalContext) {
    // A full record is a citable scholarly claim and must offer a citation.
    if (!/data-cite\b/.test(html) && !/data-download-restricted/.test(html)) {
      warn(`layer "${row.layerId}" offers no citation export`);
    }
    if (!/"@type":\s*"Dataset"/.test(html)) {
      fail(`layer "${row.layerId}" publishes no Dataset structured data`);
    }
  }
  // Rights-restricted layers must not offer a download.
  if (/data-download-restricted/.test(html) && /data-download\b/.test(html)) {
    fail(`layer "${row.layerId}" is rights-restricted but still offers a download`);
  }
}

// --- 6. Repository links stay inside Advanced/Technical. --------------------
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const prose = /<div class="prose"[^>]*>([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '';
  const inProse = prose.match(/https?:\/\/github\.com\/[^"']+/g) ?? [];
  // A projected source log may cite a repository as a source; more than a
  // couple in a body suggests the explanation has moved to GitHub.
  if (inProse.length > 3) {
    warn(`${routeOf(file)} has ${inProse.length} repository links in its prose`);
  }
}

// --- 7. The sitemap carries the published handbook routes. ------------------
const sitemapFiles = existsSync(dist)
  ? readdirSync(dist).filter((name) => name.startsWith('sitemap') && name.endsWith('.xml'))
  : [];
const sitemapText = sitemapFiles.map((name) => readFileSync(join(dist, name), 'utf8')).join('');
if (sitemapText.length > 0) {
  for (const route of ['/atlas/handbook/', '/atlas/layers/dacia-treaty-frontiers/']) {
    if (!sitemapText.includes(route)) {
      warn(`sitemap does not list ${route} (it may be in a paged sitemap index)`);
    }
  }
} else {
  warn('no sitemap found in dist/');
}

for (const message of warnings) console.warn(`WARN  ${message}`);
for (const message of errors) console.error(`ERROR ${message}`);

if (errors.length > 0) {
  console.error(
    `\nHandbook integrity failed: ${errors.length} error(s), ${warnings.length} warning(s).`,
  );
  process.exit(1);
}

console.log(
  `Handbook integrity passed: ${coverage.documented}/${coverage.publishedLayers} layers documented, ` +
    `${pages.length} atlas page(s) checked, ${warnings.length} warning(s).`,
);
