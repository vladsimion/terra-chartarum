/**
 * Per-map coverage polygons (ATLAS-1002 / KAN-74)
 *
 * Each corpus map has a depicted-extent footprint, authored once in the merged
 * /public/geo/coverage.geojson (every feature carries `properties.mapId`). That
 * single file is: (a) rendered on the atlas as a GeoJSON GeoLayer, (b) the source
 * of the atlas "depicted within" footprint filter, and (c) the source of the
 * collection index "covers …" facet. A map's `coveragePath` points into it by
 * fragment (`/geo/coverage.geojson#<id>`), so there is one source of truth.
 *
 * Read server-side at build with fs; the ray-casting used in the browser is
 * inlined separately in AtlasMap (no turf.js on either side).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getCorpus } from './corpus';

export type Ring = [number, number][];

interface CoverageFeature {
  mapId: string;
  title?: string;
  region?: string;
  ring: Ring;
}

const RAW = JSON.parse(
  readFileSync(join(process.cwd(), 'public', 'geo', 'coverage.geojson'), 'utf-8'),
) as {
  features: {
    properties: { mapId: string; title?: string; region?: string };
    geometry: { type: string; coordinates: number[][][] };
  }[];
};

const FEATURES: CoverageFeature[] = RAW.features.map((f) => ({
  mapId: f.properties.mapId,
  title: f.properties.title,
  region: f.properties.region,
  ring: f.geometry.coordinates[0] as Ring,
}));

/** Ray-casting point-in-polygon over a single [lng,lat] ring. */
export function pointInRing([x, y]: [number, number], ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** The footprints as light [mapId, ring] pairs — passed to the atlas payload. */
export function coveragePolygons(): { mapId: string; ring: Ring }[] {
  return FEATURES.map((f) => ({ mapId: f.mapId, ring: f.ring }));
}

/** IDs of maps that have an authored footprint. */
export function coverageMapIds(): Set<string> {
  return new Set(FEATURES.map((f) => f.mapId));
}

/** Representative [lng,lat] for each corpus region name (first map in it). */
function regionPoints(): Map<string, [number, number]> {
  const pts = new Map<string, [number, number]>();
  for (const m of getCorpus()) {
    if (!pts.has(m.region)) pts.set(m.region, m.coords);
  }
  return pts;
}

/** Map IDs whose footprint covers the representative point of `region`. */
export function mapsCoveringRegion(region: string): string[] {
  const pt = regionPoints().get(region);
  if (!pt) return [];
  return FEATURES.filter((f) => pointInRing(pt, f.ring)).map((f) => f.mapId);
}

/** Region names whose representative point falls inside `mapId`'s footprint. */
export function regionsCoveredByMap(mapId: string): string[] {
  const f = FEATURES.find((x) => x.mapId === mapId);
  if (!f) return [];
  return [...regionPoints()]
    .filter(([, pt]) => pointInRing(pt, f.ring))
    .map(([region]) => region)
    .sort();
}

/** Sorted region names that at least one footprint covers (facet options). */
export function regionsWithCoverage(): string[] {
  const out = new Set<string>();
  for (const [region] of regionPoints()) {
    if (mapsCoveringRegion(region).length > 0) out.add(region);
  }
  return [...out].sort();
}
