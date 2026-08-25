#!/usr/bin/env node
/**
 * build-plate-derivatives
 *
 * The Cities Remember essay carries three large images, and until this script
 * existed every reader downloaded all three at their archival size no matter how
 * small the box they landed in: the 1920x1185 Nolli sheet (1,209,518 bytes), the
 * Nuremberg chronicle view (472,412) and the modern Rome basemap (778,760).
 * Together they are most of that route's transfer weight.
 *
 * The plates cannot simply be shrunk. scripts/validate-geo-interop.mjs reads
 * nolli-sheet-01.jpg off disk and asserts its 1920x1185 frame against the four
 * control points in public/annotations/cities-remember-nolli.json, and that
 * annotation is published: its target.source.id is the plate's own URL, so the
 * pixel space the georeference is stated in has to stay fetchable at that URL.
 * The canonical files therefore stay exactly as they are, byte for byte.
 *
 * What this script adds is a ladder of display-sized derivatives beside them, in
 * display/, so the browser can fetch the rung that matches the box the image
 * actually occupies instead of the archival master. The canonical plate is still
 * one click away in CityMemoryOverlay, which is where the reader inspects the
 * registration - the detail is deferred, not removed.
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
const plateDir = join(root, 'public', 'images', 'cities-remember');
/**
 * Derivatives live in their own directory rather than beside the canonicals.
 * The sheet is named nolli-sheet-01.jpg, so *any* `-<number>.<ext>` derivative
 * pattern also matches the canonical plate - a sweep of stale rungs written next
 * to it would delete the one file this whole change exists to preserve. A
 * separate directory makes that collision impossible instead of merely unlikely.
 */
const outDir = join(plateDir, 'display');

/**
 * Rung widths per plate, chosen from the box each image actually occupies.
 *
 * The essay column is `--content-max` (the 1200px shell) less its padding, so
 * ~1120 CSS px at desktop. CityMemoryOverlay's 16/10 stage renders the sheet at
 * about that width; inside CompareSlider's 9/8 frame `object-fit: cover` renders
 * it wider than the stage - roughly 1.44x the column, or ~1613px - which is what
 * the 1600 rung and the `sizes` attributes in the essay are for. A 375px phone
 * at DPR 3 lands in the same region from the other direction. No rung exceeds
 * its source, so nothing is upscaled here.
 *
 * The essay's CompareSlider deliberately stops its srcset at the 1600 rung even
 * though the frame asks for ~1613px. Those two panes are cropped comparison
 * views, not the inspection surface - CityMemoryOverlay is - and honouring the
 * last 0.8% would make the browser step up to the 1920 rung for 224 KiB nobody
 * can see. The `sizes` attributes there state the true width; the ladder is what
 * declines to serve it. The overlay keeps the 1920 rung, and offers the
 * canonical plate itself behind its "Full plate" control.
 */
const PLATES = [
  { file: 'nolli-sheet-01.jpg', fallback: 'jpeg', widths: [640, 960, 1280, 1600] },
  { file: 'nuremberg-chronicle.jpg', fallback: 'jpeg', widths: [640, 960] },
  { file: 'rome-modern.webp', fallback: 'webp', widths: [560, 800, 1120] },
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

await mkdir(outDir, { recursive: true });

const written = new Set();
for (const { file, fallback, widths } of PLATES) {
  const source = join(plateDir, file);
  const base = file.replace(/\.[^.]+$/, '');
  const { width: sourceWidth, height: sourceHeight } = await sharp(source).metadata();
  const sourceBytes = (await stat(source)).size;
  console.log(
    `\n${file}  ${sourceWidth}x${sourceHeight}  ${kib(sourceBytes)}  (canonical, untouched)`,
  );

  // The source width is a rung too: AVIF beats every canonical at its own pixel
  // count, and the sheet's 1920 rung is what a DPR-2 desktop overlay asks for.
  const rungs = [...new Set([...widths, sourceWidth])]
    .filter((width) => width <= sourceWidth)
    .sort((a, b) => a - b);

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
      written.add(name);
      console.log(
        `  display/${name.padEnd(32)} ${String(width).padStart(4)}x${String(height).padStart(4)}  ${kib(buffer.length).padStart(9)}`,
      );
    }
  }
}

// Sweep rungs dropped from PLATES, which nothing references but everything still
// deploys. Confined to outDir, which holds nothing this script did not write.
for (const name of await readdir(outDir)) {
  if (written.has(name)) continue;
  await rm(join(outDir, name));
  console.log(`\nremoved stale derivative display/${name}`);
}

// Belt and braces after a sweep: the canonicals are the point of the exercise.
for (const { file } of PLATES) {
  const bytes = await stat(join(plateDir, file)).then(
    (s) => s.size,
    () => 0,
  );
  if (bytes === 0) {
    console.error(`\nFATAL: canonical plate ${file} is missing. Restore it from git.`);
    process.exit(1);
  }
}

console.log(`\nWrote ${written.size} derivatives into public/images/cities-remember/display/.`);
console.log('Canonical plates unchanged; geo:interop:validate still reads them off disk.');
