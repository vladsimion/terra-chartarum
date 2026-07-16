#!/usr/bin/env node
/**
 * build-map-tiles (ATLAS-805 / KAN-69)
 *
 * Turns a high-resolution scan of a corpus map into a DeepZoom (DZI) tile pyramid
 * for the OpenSeadragon viewer. Uses libvips `dzsave` — fast, streaming, standard
 * DZI output. Writes public/tiles/<id>.dzi plus public/tiles/<id>_files/, so the
 * viewer can point at the stable tile source `/tiles/<id>.dzi`.
 *
 * Usage:
 *   npm run build-map-tiles -- --input scans/mercator-1569.tif --id mercator
 *   npm run build-map-tiles -- --input scans/idrisi.jpg --id idrisi --quality 82
 *
 * <id> should match the corpus map id (src/lib/corpus.ts) so the DeepZoom island
 * can resolve the tile source from the map record.
 *
 * Requires (install once, not an npm package):
 *   vips   brew install vips
 */
import { access, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tilesDir = join(root, 'public', 'tiles');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const exists = (p) =>
  access(p, constants.F_OK).then(() => true).catch(() => false);

function hasBinary(bin) {
  const r = spawnSync(bin, ['--version'], { stdio: 'ignore' });
  return !r.error;
}

function die(msg) {
  console.error(msg);
  process.exit(1);
}

const input = arg('input');
const id = arg('id');
const quality = arg('quality') ?? '85';

if (!input || !id) {
  die('Usage: npm run build-map-tiles -- --input <scan> --id <map-id> [--quality 85]');
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
  die(`Invalid --id "${id}". Use lowercase letters, numbers, and hyphens (match a corpus map id).`);
}
if (!(await exists(input))) die(`Input not found: ${input}`);
if (!hasBinary('vips')) die('vips not found on PATH. Install libvips: brew install vips');

await mkdir(tilesDir, { recursive: true });

// vips appends .dzi to the base name and creates a sibling <base>_files/ dir.
const outBase = join(tilesDir, id);
const args = ['dzsave', input, outBase, '--suffix', `.jpg[Q=${quality}]`];

console.log(`$ vips ${args.join(' ')}`);
const run = spawnSync('vips', args, { stdio: 'inherit' });
if (run.status !== 0) die(`\nvips failed (exit ${run.status}).`);

console.log(`\nWrote ${outBase}.dzi (+ ${id}_files/)
OpenSeadragon tile source: /tiles/${id}.dzi
Reference it from the "${id}" corpus record so the DeepZoom island (KAN-69) can
mount the viewer on /collection/${id}/.`);
