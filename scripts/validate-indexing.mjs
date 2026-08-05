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

  // --- SEO surface -----------------------------------------------------------
  //
  // The pages under dist/embed/ are raw legacy HTML documents, not Astro
  // routes: they carry no shared head, so the whole-site assertions below skip
  // them and they get their own check further down.
  const isEmbed = (path) => path.slice(DIST.length + 1).startsWith('embed/');
  const portalPages = builtHtml.filter(({ path }) => !isEmbed(path));

  const attr = (html, pattern) => html.match(pattern)?.[1] ?? null;
  const canonicalOf = (html) => attr(html, /<link rel="canonical" href="([^"]+)"/);
  const ogUrlOf = (html) => attr(html, /<meta property="og:url" content="([^"]+)"/);
  const descriptionOf = (html) => attr(html, /<meta name="description" content="([^"]*)"/);

  // A page whose og:url disagrees with its canonical tells crawlers and social
  // scrapers two different things about where it lives.
  for (const { path, html } of portalPages) {
    const relative = path.slice(DIST.length + 1);
    const canonical = canonicalOf(html);
    check(canonical !== null, `${relative} has no canonical URL`);
    check(
      canonical === null || ogUrlOf(html) === canonical,
      `${relative} og:url does not match its canonical URL`,
    );
  }

  // Descriptions are what a search result actually shows. A missing one lets
  // the engine invent a snippet; a shared one makes two pages look identical.
  const descriptions = new Map();
  for (const { path, html } of portalPages) {
    const relative = path.slice(DIST.length + 1);
    const description = descriptionOf(html);
    check(Boolean(description), `${relative} has an empty or missing meta description`);
    if (!description) continue;
    const seen = descriptions.get(description);
    check(
      seen === undefined,
      `${relative} reuses the meta description of ${seen} - each page needs its own`,
    );
    descriptions.set(description, relative);
  }

  // Structured data must be machine-readable to be worth emitting at all.
  const jsonLdBlocks = (html) => [
    ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
  ];
  for (const { path, html } of portalPages) {
    const relative = path.slice(DIST.length + 1);
    for (const [, body] of jsonLdBlocks(html)) {
      try {
        JSON.parse(body);
      } catch (error) {
        check(false, `${relative} emits JSON-LD that does not parse: ${error.message}`);
      }
    }
  }

  // Essays are articles, not generic website pages, and their JSON-LD has to
  // agree with the frontmatter it was built from.
  for (const essay of released) {
    const path = resolve(DIST, `essays/${essay.slug}/index.html`);
    if (!existsSync(path)) continue;
    const html = readFileSync(path, 'utf8');
    check(
      html.includes('<meta property="og:type" content="article">'),
      `essay '${essay.slug}' is not marked og:type=article`,
    );
    check(
      /<meta property="article:published_time" content="\d{4}-\d{2}-\d{2}"/.test(html),
      `essay '${essay.slug}' has no article:published_time`,
    );

    const article = jsonLdBlocks(html)
      .flatMap(([, body]) => {
        try {
          const parsed = JSON.parse(body);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return [];
        }
      })
      .find((node) => node['@type'] === 'Article');
    check(article !== undefined, `essay '${essay.slug}' emits no Article JSON-LD`);
    if (article && essay.updatedAt) {
      check(
        article.dateModified === essay.updatedAt,
        `essay '${essay.slug}' JSON-LD dateModified '${article.dateModified}' != frontmatter updatedAt '${essay.updatedAt}'`,
      );
    }
  }

  // Google uses <lastmod> to decide what to recrawl; an essay without one looks
  // frozen even after it is revised.
  for (const essay of released) {
    if (!essay.updatedAt) continue;
    const entry = sitemap.match(
      new RegExp(`<loc>${ORIGIN}/essays/${essay.slug}/</loc>\\s*<lastmod>([^<]+)</lastmod>`),
    );
    check(entry !== null, `sitemap entry for essay '${essay.slug}' has no <lastmod>`);
  }

  // The legacy embeds duplicate essay prose word for word. They stay crawlable
  // on purpose - a URL blocked in robots.txt is never fetched, so its noindex
  // is never seen and the duplicate can linger in the index anyway.
  for (const { path, html } of builtHtml.filter(({ path }) => isEmbed(path))) {
    const relative = path.slice(DIST.length + 1);
    const slug = relative.split('/')[1];
    check(
      /<meta name="robots" content="noindex,follow">/.test(html),
      `${relative} duplicates essay prose but is not noindex`,
    );
    check(
      html.includes(`<link rel="canonical" href="${ORIGIN}/essays/${slug}/">`),
      `${relative} does not point its canonical at /essays/${slug}/`,
    );
  }
  check(
    !/^\s*Disallow:\s*\/embed\//m.test(robots),
    'robots.txt blocks /embed/, which hides the noindex those pages rely on',
  );
}

if (errors.length) {
  console.error(`Indexing QA failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Indexing QA passed: search, sitemap, canonical and robots are aligned.');
