import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { partitionEssays } from './lib/essay-release.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = resolve(ROOT, 'dist');
const ORIGIN = 'https://terra-chartarum.pages.dev';
const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

/** Every .html file under dist/, recursively. */
function htmlFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = resolve(dir, entry);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return path.endsWith('.html') ? [path] : [];
  });
}

check(existsSync(DIST), 'dist/ is missing; run the production build first');

if (existsSync(DIST)) {
  // Only released essays are expected in the index; held ones are asserted
  // absent further down. Both halves matter - the first proves the site is
  // complete, the second proves the embargo held.
  const { released, held } = partitionEssays();
  const essaySlugs = released.map((essay) => essay.slug).sort();
  const heldSlugs = held.map((essay) => essay.slug).sort();
  const searchIndexPath = resolve(DIST, 'search-index.json');
  check(existsSync(searchIndexPath), 'search-index.json was not generated');

  if (existsSync(searchIndexPath)) {
    const searchDocs = JSON.parse(readFileSync(searchIndexPath, 'utf8'));
    const indexedEssays = searchDocs
      .filter((document) => document.type === 'essay')
      .map((document) => document.id)
      .sort();
    check(
      JSON.stringify(indexedEssays) === JSON.stringify(essaySlugs),
      'search index essay ids differ from the published content collection',
    );

    const cities = searchDocs.find(
      (document) => document.type === 'essay' && document.id === 'cities-remember',
    );
    check(cities?.url === '/essays/cities-remember/', 'Cities Remember has no indexed route');
    check(
      JSON.stringify(cities?.rooms) === JSON.stringify(['city', 'archive', 'theatre']),
      'Cities Remember search facets do not expose City, Archive and Theatre',
    );
  }

  const sitemap = readdirSync(DIST)
    .filter((file) => /^sitemap.*\.xml$/.test(file))
    .map((file) => readFileSync(resolve(DIST, file), 'utf8'))
    .join('\n');
  for (const slug of essaySlugs) {
    check(
      sitemap.includes(`${ORIGIN}/essays/${slug}/`),
      `sitemap is missing the essay route '${slug}'`,
    );
  }

  // Staged release (KAN-263): a held essay must leave no trace in the build -
  // no route, no sitemap entry, no legacy embed payload, and no live essay
  // linking into its 404. Use EssayLink.astro for prose cross-references.
  const builtHtml = htmlFiles(DIST).map((path) => ({ path, html: readFileSync(path, 'utf8') }));
  for (const slug of heldSlugs) {
    check(
      !existsSync(resolve(DIST, `essays/${slug}/index.html`)),
      `held essay '${slug}' was built into dist/essays/`,
    );
    check(
      !sitemap.includes(`${ORIGIN}/essays/${slug}/`),
      `held essay '${slug}' appears in the sitemap`,
    );
    check(
      !existsSync(resolve(DIST, `embed/${slug}`)),
      `held essay '${slug}' still ships its legacy embed payload at /embed/${slug}/`,
    );
    const linked = builtHtml
      .filter(({ html }) => html.includes(`/essays/${slug}/`))
      .map(({ path }) => path.slice(DIST.length + 1));
    check(
      linked.length === 0,
      `held essay '${slug}' is linked from ${linked.slice(0, 3).join(', ')}`,
    );
  }

  const citiesHtmlPath = resolve(DIST, 'essays/cities-remember/index.html');
  check(existsSync(citiesHtmlPath), 'Cities Remember HTML was not generated');
  if (existsSync(citiesHtmlPath)) {
    const html = readFileSync(citiesHtmlPath, 'utf8');
    check(
      html.includes(`<link rel="canonical" href="${ORIGIN}/essays/cities-remember/">`),
      'Cities Remember canonical URL does not match production',
    );
    check(
      html.includes(`${ORIGIN}/og/cities-remember.png`),
      'Cities Remember social image URL does not match production',
    );
    check(!/<meta[^>]+noindex/i.test(html), 'Cities Remember is marked noindex');
  }

  const robots = readFileSync(resolve(DIST, 'robots.txt'), 'utf8');
  check(
    robots.includes(`Sitemap: ${ORIGIN}/sitemap-index.xml`),
    'robots.txt does not advertise the production sitemap',
  );
}

if (errors.length) {
  console.error(`Indexing QA failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Indexing QA passed: search, sitemap, canonical and robots are aligned.');
