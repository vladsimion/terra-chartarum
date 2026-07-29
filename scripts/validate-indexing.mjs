import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = resolve(ROOT, 'dist');
const ESSAYS = resolve(ROOT, 'src/content/essays');
const ORIGIN = 'https://terra-chartarum.pages.dev';
const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

check(existsSync(DIST), 'dist/ is missing; run the production build first');

if (existsSync(DIST)) {
  const essaySlugs = readdirSync(ESSAYS)
    .filter((file) => /\.(md|mdx)$/.test(file))
    .map((file) => file.replace(/\.(md|mdx)$/, ''))
    .sort();
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
