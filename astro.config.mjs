import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Portable static output; deploy target chosen later (ATLAS-605).
  output: 'static',
  // TODO(ATLAS-605): set the real production origin before launch.
  site: 'https://atlas.example.com',
  integrations: [
    mdx(),
    tailwind({ applyBaseStyles: false }),
    // Pinned to 3.2.1: later 3.x depend on the `astro:routes:resolved` hook,
    // which Astro 4.16 doesn't emit (bump when moving to Astro 5). See ATLAS-205.
    sitemap(),
  ],
  // Seamless atlas -> essay navigation is enabled per-page via <ViewTransitions/>.
  prefetch: true,
});
