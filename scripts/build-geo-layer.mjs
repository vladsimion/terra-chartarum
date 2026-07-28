#!/usr/bin/env node
/**
 * build-geo-layer (ATLAS-1001 / KAN-73)
 *
 * Turns a sourced vector dataset into a cloud-native GeoLayer asset the atlas can
 * serve statically (Regime A): PMTiles via tippecanoe, or FlatGeobuf via GDAL's
 * ogr2ogr. Output lands in public/geo/ under the exact filename a GeoLayer's `url`
 * points at (src/lib/geo.ts) — the AtlasMap toggle auto-enables the moment its
 * asset is present, so no code change is needed once the file is generated.
 *
 * The format is inferred from the output extension (.pmtiles / .fgb).
 *
 * Usage:
 *   npm run build-geo-layer -- --input data/roman-provinces.geojson \
 *     --out roman-empire-117.pmtiles --layer provinces
 *   npm run build-geo-layer -- --input data/venetian-network.gpkg \
 *     --out venetian-network-1400.fgb --simplify 0.0001
 *
 * Anything after a lone `--` is passed straight through to the underlying tool
 * (e.g. `-- -- -z8 --drop-densest-as-needed` for tippecanoe tuning).
 *
 * Requires (install once, not npm packages):
 *   tippecanoe   brew install tippecanoe
 *   ogr2ogr      brew install gdal
 */
import { access, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, basename } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const geoDir = join(root, 'public', 'geo');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

// Passthrough args: everything after a standalone `--`.
function passthrough() {
  const i = process.argv.indexOf('--', 2);
  return i !== -1 ? process.argv.slice(i + 1) : [];
}

const exists = (p) =>
  access(p, constants.F_OK)
    .then(() => true)
    .catch(() => false);

function hasBinary(bin) {
  const r = spawnSync(bin, ['--version'], { stdio: 'ignore' });
  return !r.error;
}

function die(msg) {
  console.error(msg);
  process.exit(1);
}

const input = arg('input');
const out = arg('out');
const layer = arg('layer');
const targetCrs = arg('target-crs') ?? 'EPSG:4326';
const simplify = arg('simplify');

if (!input || !out) {
  die(
    'Usage: npm run build-geo-layer -- --input <path> --out <name.pmtiles|name.fgb> [--layer <name>]',
  );
}
if (!(await exists(input))) die(`Input not found: ${input}`);
if (simplify !== undefined && (!Number.isFinite(Number(simplify)) || Number(simplify) <= 0)) {
  die('--simplify must be a positive tolerance in target-CRS units.');
}

const ext = extname(out).toLowerCase();
const outPath = join(geoDir, out);
await mkdir(geoDir, { recursive: true });

let cmd;
let args;
if (ext === '.pmtiles') {
  if (!hasBinary('tippecanoe')) {
    die('tippecanoe not found on PATH. Install it: brew install tippecanoe');
  }
  const layerName = layer || basename(out, ext);
  // -zg picks a zoom range; drop-densest keeps tiles under the size limit. Both
  // are overridable via passthrough args (they come after these on the line).
  args = [
    '-o',
    outPath,
    '--force',
    '-l',
    layerName,
    '-zg',
    '--drop-densest-as-needed',
    ...passthrough(),
    input,
  ];
  cmd = 'tippecanoe';
} else if (ext === '.fgb') {
  if (!hasBinary('ogr2ogr')) {
    die('ogr2ogr not found on PATH. Install GDAL: brew install gdal');
  }
  if (layer) console.warn('Note: --layer is ignored for FlatGeobuf output.');
  // Normalise every published vector to a two-dimensional, valid EPSG:4326
  // geometry with an on-disk spatial index. Optional simplification is explicit
  // because a defensible tolerance depends on source scale.
  args = [
    '-f',
    'FlatGeobuf',
    '-t_srs',
    targetCrs,
    '-dim',
    'XY',
    '-makevalid',
    '-lco',
    'SPATIAL_INDEX=YES',
    ...(simplify ? ['-simplify', simplify] : []),
    ...passthrough(),
    outPath,
    input,
  ];
  cmd = 'ogr2ogr';
} else {
  die(`Unsupported output extension "${ext}". Use .pmtiles (tippecanoe) or .fgb (ogr2ogr).`);
}

console.log(`$ ${cmd} ${args.join(' ')}`);
const run = spawnSync(cmd, args, { stdio: 'inherit' });
if (run.status !== 0) die(`\n${cmd} failed (exit ${run.status}).`);

console.log(`\nWrote ${outPath}
Point a GeoLayer's \`url\` at /geo/${out} in src/lib/geo.ts (set \`sourceLayer\`
to "${layer || basename(out, ext)}" for PMTiles). The atlas toggle goes live on
the next build once the file is present.`);
