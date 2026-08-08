#!/usr/bin/env node
/**
 * build-room-images
 *
 * Each of the seven rooms has a pair of photographic masters: an untitled frame
 * and a "-titled" frame with the room's anchor-essay title set into the plate's
 * negative space. The masters are ~3 MB PNGs at 1672x941 - far too heavy to ship,
 * since everything under public/ is copied verbatim into dist/ and the anchor
 * covers render on both routes that carry a hard Lighthouse performance budget
 * (/ and /essays/, see lighthouserc.json).
 *
 * This script derives the two web assets the site actually references:
 *
 *   <room>-cover.webp  1000x625 (16:10)  the anchor essay's `cover`
 *   <room>-hero.webp   1600x900 (16:9)   the anchor essay's `hero`
 *
 * The cover ratio matches .card-media's `aspect-ratio: 16 / 10`, so the browser
 * does no further cropping; the hero keeps the master's full 16:9 frame so the
 * burned-in title is never clipped.
 *
 * A non-anchor essay may also carry a photographic plate instead of the
 * generated SVG cover. Those masters come in the same untitled/titled pair and
 * yield the same two derivatives, but land in that essay's own
 * public/images/<slug>/ directory rather than under rooms/.
 *
 * Masters live in media-src/rooms/ and are gitignored (CONTRIBUTING.md: no
 * oversized assets committed). As with build-og-images, the derivatives are
 * generated once and committed rather than built in CI - a fresh clone has no
 * masters to build from. Re-run after replacing a master:
 *
 *   npm run build-room-images
 *
 * Requires: sharp (already present transitively via Astro's image service).
 */
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'media-src', 'rooms');
const imagesDir = join(root, 'public', 'images');
const outDir = join(imagesDir, 'rooms');

// Cosmography order, mirroring src/data/rooms.ts (which cannot be imported from
// a plain .mjs script). Same literal list as scripts/validate-editorial.mjs.
const ROOM_SLUGS = ['earth', 'map', 'city', 'border', 'road', 'archive', 'theatre'];

// Derivative geometry. Keep the hero size in step with the width/height
// attributes on the .essay-hero <img> in src/pages/essays/[slug].astro.
const VARIANTS = [
  { suffix: '', out: 'cover', width: 1000, height: 625 },
  { suffix: '-titled', out: 'hero', width: 1600, height: 900 },
];

// Essay plates: <essay slug> → the master filename in media-src/rooms/ behind
// each derivative. Same untitled/titled pairing as the rooms, but keyed per
// variant because the masters keep the names they were delivered under -
// media-src/ is gitignored, so renaming them would break the operator's backup
// copy and they do not follow the <room>-proposal[-titled].png pattern.
const ESSAY_PLATES = {
  'the-league-that-left-no-map': {
    cover: 'Hanseatic towns.png',
    hero: 'Hanseatic towns titled.png',
  },
};

const QUALITY = 82;

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Crop one master to a derivative's geometry and write it as webp. */
async function derive(srcPath, destPath, { width, height }) {
  const buffer = await sharp(srcPath)
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .webp({ quality: QUALITY, effort: 6 })
    .toBuffer();
  await writeFile(destPath, buffer);
  return buffer.length;
}

async function main() {
  if (!(await exists(srcDir))) {
    console.error(
      `No masters found at media-src/rooms/.\n` +
        `That directory is gitignored, so it will not exist on a fresh clone - the\n` +
        `generated .webp files under public/images/ are committed instead.\n` +
        `Restore the *-proposal*.png masters there to regenerate them.`,
    );
    process.exit(1);
  }

  await mkdir(outDir, { recursive: true });

  const missing = [];
  const results = [];

  const record = (label, { width, height }, bytes) =>
    results.push(`  ${label.padEnd(46)} ${width}x${height}  ${Math.round(bytes / 1024)} KB`);

  for (const room of ROOM_SLUGS) {
    for (const variant of VARIANTS) {
      const master = `${room}-proposal${variant.suffix}.png`;
      const srcPath = join(srcDir, master);
      if (!(await exists(srcPath))) {
        missing.push(master);
        continue;
      }
      const name = `${room}-${variant.out}.webp`;
      const bytes = await derive(srcPath, join(outDir, name), variant);
      record(`rooms/${name}`, variant, bytes);
    }
  }

  for (const [slug, masters] of Object.entries(ESSAY_PLATES)) {
    const essayDir = join(imagesDir, slug);
    await mkdir(essayDir, { recursive: true });
    for (const variant of VARIANTS) {
      const master = masters[variant.out];
      const srcPath = join(srcDir, master);
      if (!(await exists(srcPath))) {
        missing.push(master);
        continue;
      }
      const name = `${variant.out}.webp`;
      const bytes = await derive(srcPath, join(essayDir, name), variant);
      record(`${slug}/${name}`, variant, bytes);
    }
  }

  if (missing.length > 0) {
    console.error(`Missing master(s) in media-src/rooms/:\n  ${missing.join('\n  ')}`);
    process.exit(1);
  }

  console.log(`Generated ${results.length} image(s) → public/images/\n${results.join('\n')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
