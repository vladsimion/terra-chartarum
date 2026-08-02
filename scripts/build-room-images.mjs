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
const outDir = join(root, 'public', 'images', 'rooms');

// Cosmography order, mirroring src/data/rooms.ts (which cannot be imported from
// a plain .mjs script). Same literal list as scripts/validate-editorial.mjs.
const ROOM_SLUGS = ['earth', 'map', 'city', 'border', 'road', 'archive', 'theatre'];

// Derivative geometry. Keep the hero size in step with the width/height
// attributes on the .essay-hero <img> in src/pages/essays/[slug].astro.
const VARIANTS = [
  { suffix: '', out: 'cover', width: 1000, height: 625 },
  { suffix: '-titled', out: 'hero', width: 1600, height: 900 },
];

const QUALITY = 82;

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(srcDir))) {
    console.error(
      `No masters found at media-src/rooms/.\n` +
        `That directory is gitignored, so it will not exist on a fresh clone - the\n` +
        `generated .webp files under public/images/rooms/ are committed instead.\n` +
        `Restore the *-proposal*.png masters there to regenerate them.`,
    );
    process.exit(1);
  }

  await mkdir(outDir, { recursive: true });

  const missing = [];
  const results = [];

  for (const room of ROOM_SLUGS) {
    for (const { suffix, out, width, height } of VARIANTS) {
      const srcPath = join(srcDir, `${room}-proposal${suffix}.png`);
      if (!(await exists(srcPath))) {
        missing.push(`${room}-proposal${suffix}.png`);
        continue;
      }
      const name = `${room}-${out}.webp`;
      const buffer = await sharp(srcPath)
        .resize(width, height, { fit: 'cover', position: 'centre' })
        .webp({ quality: QUALITY, effort: 6 })
        .toBuffer();
      await writeFile(join(outDir, name), buffer);
      results.push(
        `  ${name.padEnd(22)} ${width}x${height}  ${Math.round(buffer.length / 1024)} KB`,
      );
    }
  }

  if (missing.length > 0) {
    console.error(`Missing master(s) in media-src/rooms/:\n  ${missing.join('\n  ')}`);
    process.exit(1);
  }

  console.log(
    `Generated ${results.length} room image(s) → public/images/rooms/\n${results.join('\n')}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
