#!/usr/bin/env node
/**
 * build-plate-derivatives
 *
 * Several essays carry large scholarly plates, and until this script existed
 * every reader downloaded all of them at their archival size no matter how small
 * the box they landed in. Cities Remember carried three - the 1920x1185 Nolli
 * sheet (1,209,518 bytes), the Nuremberg chronicle view (472,412) and the modern
 * Rome basemap (778,760). Invisible Maps of Religion carries the two heaviest
 * files in the project after them, the Hereford mappa mundi (2,350,999) and the
 * Matthew Paris itinerary (579,360); Maps That Age carries the two Ortelius
 * impressions (981,271 and 350,421). In each case they are most of the route's
 * transfer weight.
 *
 * The plates cannot simply be shrunk in place. scripts/validate-geo-interop.mjs
 * reads nolli-sheet-01.jpg off disk and asserts its 1920x1185 frame against the
 * four control points in public/annotations/cities-remember-nolli.json, and that
 * annotation is published: its target.source.id is the plate's own URL, so the
 * pixel space the georeference is stated in has to stay fetchable at that URL.
 * No annotation or validator names the Hereford, Matthew Paris or Ortelius
 * files - public/annotations/ holds the Nolli manifest alone - but they are the
 * canonical reproductions the collection catalogue cites, and treating every
 * plate the same way keeps that distinction from having to be rechecked each
 * time one is added. The canonical files stay exactly as they are, byte for
 * byte.
 *
 * What this script adds is a ladder of display-sized derivatives beside them, in
 * display/, so the browser can fetch the rung that matches the box the image
 * actually occupies instead of the archival master. In Cities Remember the
 * canonical plate is still one click away in CityMemoryOverlay, which is where
 * the reader inspects the registration - the detail is deferred, not removed.
 *
 *   display/<name>-<width>.avif   modern path
 *   display/<name>-<width>.<ext>  fallback path, in the canonical's own format
 *
 * AVIF and JPEG rather than WebP for the engraved plates: WebP measured *worse*
 * than mozjpeg on the Nolli sheet (856 KiB against 786 at 1920, 578 against 536
 * at 1600), so it earns no place as either the modern path or the fallback. The
 * modern basemap is already a WebP and keeps WebP as its fallback.
 *
 * Derivatives are generated once and committed, like build-og-images and
 * build-room-images. Unlike those, the master here is the committed canonical
 * plate rather than a gitignored file under media-src/, so a fresh clone can
 * always regenerate:
 *
 *   npm run build-plate-derivatives
 *
 * Requires: sharp.
 */
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imagesDir = join(root, 'public', 'images');
/**
 * Derivatives live in their own directory rather than beside the canonicals.
 * The Nolli sheet is named nolli-sheet-01.jpg, so *any* `-<number>.<ext>`
 * derivative pattern also matches the canonical plate - a sweep of stale rungs
 * written next to it would delete the one file this whole change exists to
 * preserve. A separate directory makes that collision impossible instead of
 * merely unlikely, and it keeps the sweep below honest for every essay added
 * since: `public/images/<essay>/display/` holds nothing this script did not
 * write, whatever the canonicals beside it happen to be called.
 */
const displayDirFor = (essay) => join(imagesDir, essay, 'display');

/**
 * Rung widths per plate, chosen from the box each image actually occupies.
 *
 * The essay column is `--content-max` (the 1200px shell) less its padding, so
 * ~1106 CSS px at Lighthouse's 1350px desktop viewport. That is the box an
 * unframed CompareSlider gives each of its two layers - `width: 100%`, height
 * auto - and it is what the 1120 rung and the `sizes` attributes in Invisible
 * Maps of Religion and Maps That Age are for. A 375px phone at DPR 3 lands in
 * the same region from the other direction.
 *
 * Cities Remember is the exception, because both of its surfaces are framed:
 * CityMemoryOverlay's 16/10 stage renders the sheet at about the column width,
 * and inside CompareSlider's 9/8 frame `object-fit: cover` renders it wider
 * than the stage - roughly 1.44x the column, or ~1613px - which is what its
 * 1600 rung is for. No rung exceeds its source, so nothing is upscaled here.
 *
 * Cities Remember's CompareSlider deliberately stops its srcset at the 1600
 * rung even though the frame asks for ~1613px. Those two panes are cropped
 * comparison views, not the inspection surface - CityMemoryOverlay is - and
 * honouring the last 0.8% would make the browser step up to the 1920 rung for
 * 224 KiB nobody can see. The `sizes` attributes there state the true width;
 * the ladder is what declines to serve it. The overlay keeps the 1920 rung, and
 * offers the canonical plate itself behind its "Full plate" control.
 *
 * The religion and Ortelius ladders stop at 1120 for the same reason, and it
 * matters most for Hereford: at its 1920 source width even AVIF is 1,353 KiB,
 * more than the entire 1,250,000-byte content budget, to fill a 1106px box on a
 * DPR-2 screen. Both essays say in their own prose that these panes are "a
 * comparison of reading behaviour" and "a visual comparison, not a pixel
 * measurement", and both link the reader who wants the plate itself to its
 * catalogue entry - /collection/hereford/ and /collection/religion-matthew-paris/
 * still serve the canonicals. That is this pair's equivalent of Cities
 * Remember's "Full plate" control. ortelius-1587.jpg is the exception that
 * proves the rule: its source is only 800px wide, so its top rung is 800 not
 * because a DPR-2 reader is being served but because the box is wider than the
 * plate.
 *
 * `widths` is the ladder, complete. There is no implicit source-width rung: a
 * ladder that silently topped out at the master would have written that 1,353
 * KiB Hereford AVIF for nothing to reference, and the rung a surface wants is
 * an editorial choice, not an arithmetic one. Nothing here exceeds its source,
 * so nothing is upscaled.
 */
const PLATES = [
  // Cities Remember's top rungs are the ones CityMemoryOverlay asks for; its
  // CompareSlider stops one below on the sheet, as the note above explains.
  {
    essay: 'cities-remember',
    file: 'nolli-sheet-01.jpg',
    fallback: 'jpeg',
    widths: [640, 960, 1280, 1600, 1920],
  },
  {
    essay: 'cities-remember',
    file: 'nuremberg-chronicle.jpg',
    fallback: 'jpeg',
    widths: [640, 960, 1276],
  },
  {
    essay: 'cities-remember',
    file: 'rome-modern.webp',
    fallback: 'webp',
    widths: [560, 800, 1120, 1600],
  },
  {
    essay: 'invisible-maps-religion',
    file: 'hereford.jpg',
    fallback: 'jpeg',
    widths: [640, 960, 1120],
  },
  {
    essay: 'invisible-maps-religion',
    file: 'matthew-paris.jpg',
    fallback: 'jpeg',
    widths: [640, 960, 1120],
  },
  { essay: 'maps-that-age', file: 'ortelius-1579.jpg', fallback: 'jpeg', widths: [640, 960, 1120] },
  { essay: 'maps-that-age', file: 'ortelius-1587.jpg', fallback: 'jpeg', widths: [640, 800] },
];

/**
 * AVIF q45 holds the engraving. Compared at native scale against a lossless
 * resample of the same rung, the hatching around Castel Sant'Angelo and the
 * street numbering are indistinguishable from q50 and from mozjpeg q80: at these
 * widths the visible loss is the resample, not the codec. The reader who wants
 * the archival pixels opens the canonical plate from the overlay.
 */
const ENCODERS = {
  avif: { ext: 'avif', options: { quality: 45, effort: 5, chromaSubsampling: '4:4:4' } },
  jpeg: { ext: 'jpg', options: { quality: 80, mozjpeg: true, progressive: true } },
  webp: { ext: 'webp', options: { quality: 80, effort: 6 } },
};

const kib = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;

const essays = [...new Set(PLATES.map(({ essay }) => essay))];
for (const essay of essays) await mkdir(displayDirFor(essay), { recursive: true });

// Keyed by essay, because the sweep below has to stay confined to one essay's
// display/ at a time - a flat set would let a plate in one essay vouch for a
// stale rung in another, or delete a live one.
const written = new Map(essays.map((essay) => [essay, new Set()]));
for (const { essay, file, fallback, widths } of PLATES) {
  const plateDir = join(imagesDir, essay);
  const outDir = displayDirFor(essay);
  const source = join(plateDir, file);
  const base = file.replace(/\.[^.]+$/, '');
  const { width: sourceWidth, height: sourceHeight } = await sharp(source).metadata();
  const sourceBytes = (await stat(source)).size;
  console.log(
    `\n${essay}/${file}  ${sourceWidth}x${sourceHeight}  ${kib(sourceBytes)}  (canonical, untouched)`,
  );

  // A rung wider than the master would be an upscale, and `withoutEnlargement`
  // would silently write it at the source width under a lying filename.
  const overshot = widths.filter((width) => width > sourceWidth);
  if (overshot.length) {
    console.error(
      `\nFATAL: ${essay}/${file} is ${sourceWidth}px wide; widths ${overshot.join(', ')} exceed it.`,
    );
    process.exit(1);
  }
  const rungs = [...new Set(widths)].sort((a, b) => a - b);

  for (const width of rungs) {
    const height = Math.round((sourceHeight / sourceWidth) * width);
    for (const format of ['avif', fallback]) {
      const { ext, options } = ENCODERS[format];
      // At the source width the canonical file already *is* the fallback rung.
      // Re-encoding it under a second name would ship the same pixels twice and
      // invite the two copies to drift.
      if (format === fallback && width === sourceWidth) continue;
      const name = `${base}-${width}.${ext}`;
      const buffer = await sharp(source)
        .resize({ width, withoutEnlargement: true })
        .toFormat(format, options)
        .toBuffer();
      await writeFile(join(outDir, name), buffer);
      written.get(essay).add(name);
      console.log(
        `  display/${name.padEnd(32)} ${String(width).padStart(4)}x${String(height).padStart(4)}  ${kib(buffer.length).padStart(9)}`,
      );
    }
  }
}

// Sweep rungs dropped from PLATES, which nothing references but everything still
// deploys. Confined to each essay's display/, which holds nothing this script
// did not write - never to the directory the canonicals themselves live in.
for (const essay of essays) {
  const outDir = displayDirFor(essay);
  for (const name of await readdir(outDir)) {
    if (written.get(essay).has(name)) continue;
    await rm(join(outDir, name));
    console.log(`\nremoved stale derivative ${essay}/display/${name}`);
  }
}

// Belt and braces after a sweep: the canonicals are the point of the exercise.
for (const { essay, file } of PLATES) {
  const bytes = await stat(join(imagesDir, essay, file)).then(
    (s) => s.size,
    () => 0,
  );
  if (bytes === 0) {
    console.error(`\nFATAL: canonical plate ${essay}/${file} is missing. Restore it from git.`);
    process.exit(1);
  }
}

const total = [...written.values()].reduce((n, set) => n + set.size, 0);
console.log(`\nWrote ${total} derivatives across ${essays.length} essays:`);
for (const essay of essays) {
  console.log(`  public/images/${essay}/display/  ${written.get(essay).size}`);
}
console.log('Canonical plates unchanged; geo:interop:validate still reads them off disk.');
