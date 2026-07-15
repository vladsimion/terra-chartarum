import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  // Portable static output; deploy target chosen later (ATLAS-605).
  output: 'static',
  // TODO(ATLAS-605): set the real production origin before launch.
  site: 'https://atlas.example.com',
  integrations: [
    mdx(),
    tailwind({ applyBaseStyles: false }),
    // TODO(ATLAS-205): re-add @astrojs/sitemap (+ robots.txt, RSS) — pin a
    // version compatible with this Astro release.
  ],
  // Seamless atlas -> essay navigation is enabled per-page via <ViewTransitions/>.
  prefetch: true,
});
