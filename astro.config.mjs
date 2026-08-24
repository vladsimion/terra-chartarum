import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { readEssayReleases } from './scripts/lib/essay-release.mjs';
import rehypeProseTables from './src/lib/rehype-prose-tables.ts';

// Production origin (KAN-56 / ATLAS-605). Drives canonical tags, absolute OG image URLs,
// sitemap entries, RSS and citation URLs; keep public/robots.txt aligned.
const SITE = 'https://terra-chartarum.pages.dev';

// Essay <lastmod> for the sitemap, keyed by the absolute URL the sitemap emits.
// `updatedAt` is already required frontmatter, so the dates exist - they just
// never reached the sitemap, and Google does use lastmod to decide what to
// recrawl. Read here via the same plain-Node helper the build scripts use (no
// Astro imports, so it is safe to load from config); getCollection() is not
// available at config time.
//
// changefreq and priority are deliberately omitted: Google ignores both, and
// inventing values would put unverifiable claims in a file a validator has to
// keep honest.
const essayLastmod = new Map(
  readEssayReleases()
    .filter((essay) => essay.updatedAt)
    .map((essay) => [`${SITE}/essays/${essay.slug}/`, new Date(`${essay.updatedAt}T00:00:00Z`)]),
);

// https://astro.build/config
export default defineConfig({
  // Portable static output, deployed to Cloudflare Pages (output dir: dist).
  output: 'static',
  site: SITE,
  integrations: [
    mdx(),
    tailwind({ applyBaseStyles: false }),
    // Pinned to 3.2.1: later 3.x depend on the `astro:routes:resolved` hook,
    // which Astro 4.16 doesn't emit (bump when moving to Astro 5). See KAN-22 (ATLAS-205).
    sitemap({
      serialize(item) {
        const lastmod = essayLastmod.get(item.url);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
  markdown: {
    // Authored tables get a scroll container so a wide one scrolls itself
    // instead of the page (WCAG 1.4.10). The MDX integration extends this
    // config by default, so essays inherit it; the Handbook processor in
    // src/lib/handbook-render.ts builds its own and passes the plugin too.
    rehypePlugins: [rehypeProseTables],
  },
  // Seamless atlas -> essay navigation is enabled per-page via <ViewTransitions/>.
  prefetch: true,
});
