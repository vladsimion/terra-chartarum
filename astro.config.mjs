import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Portable static output, deployed from the saved Sites source/version.
  output: 'static',
  // Production origin (KAN-56 / ATLAS-605). Drives canonical tags, absolute OG image URLs,
  // sitemap entries, RSS and citation URLs; keep public/robots.txt aligned.
  site: 'https://terra-chartarum-atlas.vladsimion.chatgpt.site',
  integrations: [
    mdx(),
    tailwind({ applyBaseStyles: false }),
    // Pinned to 3.2.1: later 3.x depend on the `astro:routes:resolved` hook,
    // which Astro 4.16 doesn't emit (bump when moving to Astro 5). See KAN-22 (ATLAS-205).
    sitemap(),
  ],
  // Seamless atlas -> essay navigation is enabled per-page via <ViewTransitions/>.
  prefetch: true,
});
