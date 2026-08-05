/**
 * Staged release helpers for the plain-Node build scripts (KAN-263).
 *
 * The site's own gate lives in src/lib/release.ts and runs inside Astro. These
 * scripts run outside it - before or after `astro build` - so they parse the
 * frontmatter directly. Keep the two in step: same field, same comparison.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ESSAYS = resolve(import.meta.dirname, '../../src/content/essays');

/** Today's date as `YYYY-MM-DD`, local time - mirrors release.ts `today()`. */
export function today(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Honours the same local-authoring escape hatch as the site. When set, every
 * essay is built, so the release assertions must stand down rather than fail a
 * deliberately unfiltered build.
 */
export function showUnreleased() {
  return process.env.SHOW_UNRELEASED === '1';
}

/**
 * Every essay's slug, release date, last-modified date and legacy embed path,
 * read straight from frontmatter. Throws on a missing or malformed `releaseAt`
 * - the schema requires it, and a silent default here could publish an
 * embargoed essay. `updatedAt` is also schema-required, but it feeds the
 * sitemap's <lastmod> rather than the embargo, so a missing value degrades to
 * null (no lastmod) instead of failing the build.
 */
export function readEssayReleases() {
  return readdirSync(ESSAYS)
    .filter((file) => /\.(md|mdx)$/.test(file))
    .sort()
    .map((file) => {
      const slug = file.replace(/\.(md|mdx)$/, '');
      const source = readFileSync(resolve(ESSAYS, file), 'utf8');
      const frontmatter = source.split(/^---$/m)[1] ?? '';
      const releaseAt = frontmatter.match(/^releaseAt: '?(\d{4}-\d{2}-\d{2})'?\s*$/m)?.[1];
      if (!releaseAt) throw new Error(`${file}: missing or malformed releaseAt`);
      const updatedAt = frontmatter.match(/^updatedAt: '?(\d{4}-\d{2}-\d{2})'?\s*$/m)?.[1] ?? null;
      const embedPath = frontmatter.match(/^embedPath: '?(\S+?)'?\s*$/m)?.[1] ?? null;
      return { slug, releaseAt, updatedAt, embedPath };
    });
}

/** Slugs split by whether their release date has arrived. */
export function partitionEssays(now = new Date()) {
  const all = readEssayReleases();
  if (showUnreleased()) return { released: all, held: [] };
  const cutoff = today(now);
  return {
    released: all.filter((essay) => essay.releaseAt <= cutoff),
    held: all.filter((essay) => essay.releaseAt > cutoff),
  };
}
