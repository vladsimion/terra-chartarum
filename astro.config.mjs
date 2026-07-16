import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Portable static output, deployed to Cloudflare Pages via git integration
  // (build: `npm run build`, output dir: `dist`). See KAN-56.
  output: 'static',
  // Production origin (ATLAS-605) — Cloudflare Pages default subdomain. Drives
  // canonical tags, absolute OG image URLs, the sitemap, RSS, and citation URLs.
  // If the CF project is named something other than `terra-chartarum`, update
  // this (and public/robots.txt) to match its <project>.pages.dev subdomain.
  site: 'https://terra-chartarum.pages.dev',
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
