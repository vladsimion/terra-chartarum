#!/usr/bin/env node
/**
 * Deterministic geo-layer release manifest (KAN-209–211).
 *
 * `--check` (the default) validates catalogue metadata, GeoJSON structure,
 * geometry coordinate bounds, feature counts, checksums and the committed
 * public manifest. `--write` refreshes that manifest after an intentional asset
 * change. FlatGeobuf internals remain covered by scripts/vmn/validate.py; this
 * script provides the generic publication contract shared by every format.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cataloguePath = join(root, 'data', 'geo', 'catalog.json');
const manifestPath = join(root, 'public', 'geo', 'manifest.json');
const required = [
  'id',
  'file',
  'format',
  'crs',
  'geometry',
  'featureCount',
  'yearFrom',
  'yearTo',
  'source',
  'license',
  'attribution',
];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function visitCoordinates(value, visit) {
  if (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  ) {
    visit(value);
    return;
  }
  invariant(Array.isArray(value), 'geometry coordinates must be nested arrays');
  for (const child of value) visitCoordinates(child, visit);
}

function validateGeoJSON(asset, bytes) {
  const data = JSON.parse(bytes.toString('utf8'));
  invariant(data.type === 'FeatureCollection', `${asset.file}: expected FeatureCollection`);
  invariant(
    Array.isArray(data.features) && data.features.length === asset.featureCount,
    `${asset.file}: expected ${asset.featureCount} features, found ${data.features?.length}`,
  );

  const geometry = new Set();
  for (const [index, feature] of data.features.entries()) {
    invariant(feature?.type === 'Feature', `${asset.file} feature ${index}: expected Feature`);
    invariant(feature.geometry?.type, `${asset.file} feature ${index}: missing geometry type`);
    invariant(feature.geometry?.coordinates, `${asset.file} feature ${index}: missing coordinates`);
    geometry.add(feature.geometry.type);
    visitCoordinates(feature.geometry.coordinates, ([lon, lat]) => {
      invariant(
        Number.isFinite(lon) && Number.isFinite(lat),
        `${asset.file} feature ${index}: non-finite coordinate`,
      );
      invariant(
        lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90,
        `${asset.file} feature ${index}: coordinate outside EPSG:4326 bounds`,
      );
    });
  }
  // A layer may be legitimately empty: the Dacia public tier publishes only
  // records cleared by human review, and until that review happens the right
  // answer is nought features rather than a layer that quietly shows unreviewed
  // ones. There is no geometry to compare in that case, but the catalogue must
  // still declare what the layer will hold once it fills.
  if (data.features.length === 0) {
    invariant(
      Array.isArray(asset.geometry) && asset.geometry.length > 0,
      `${asset.file}: an empty layer must still declare its geometry in the catalogue`,
    );
    return;
  }
  invariant(
    JSON.stringify([...geometry].sort()) === JSON.stringify([...asset.geometry].sort()),
    `${asset.file}: geometry types ${[...geometry]} do not match catalogue ${asset.geometry}`,
  );
}

async function buildManifest() {
  const catalogue = JSON.parse(await readFile(cataloguePath, 'utf8'));
  invariant(catalogue.schemaVersion === 1, 'data/geo/catalog.json: unsupported schemaVersion');
  invariant(Array.isArray(catalogue.assets) && catalogue.assets.length > 0, 'catalogue is empty');

  const ids = new Set();
  const files = new Set();
  const assets = [];
  for (const asset of catalogue.assets) {
    for (const field of required) {
      invariant(
        asset[field] !== undefined && asset[field] !== '',
        `${asset.id || asset.file || 'asset'}: missing ${field}`,
      );
    }
    invariant(!ids.has(asset.id), `duplicate geo-layer id: ${asset.id}`);
    invariant(!files.has(asset.file), `duplicate geo-layer file: ${asset.file}`);
    invariant(asset.crs === 'EPSG:4326', `${asset.id}: only EPSG:4326 is publishable`);
    invariant(asset.yearFrom <= asset.yearTo, `${asset.id}: invalid temporal extent`);
    ids.add(asset.id);
    files.add(asset.file);

    const bytes = await readFile(join(root, 'public', 'geo', asset.file));
    if (asset.format === 'geojson') validateGeoJSON(asset, bytes);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const version = sha256.slice(0, 12);
    assets.push({
      ...asset,
      bytes: bytes.byteLength,
      sha256,
      version,
      url: `/geo/${asset.file}?v=${version}`,
    });
  }

  const release = createHash('sha256')
    .update(assets.map(({ id, sha256 }) => `${id}:${sha256}`).join('\n'))
    .digest('hex')
    .slice(0, 16);
  return {
    schemaVersion: 1,
    release: `geo-${release}`,
    generatedBy: 'scripts/geo-release.mjs',
    assets,
  };
}

const expected = `${JSON.stringify(await buildManifest(), null, 2)}\n`;
if (process.argv.includes('--write')) {
  await writeFile(manifestPath, expected);
  console.log(`Wrote ${manifestPath}`);
} else {
  const actual = await readFile(manifestPath, 'utf8');
  invariant(
    actual === expected,
    'public/geo/manifest.json is stale; run `npm run geo:manifest` and review the diff',
  );
  console.log('Geo release QA: catalogue, assets and manifest are consistent.');
}
