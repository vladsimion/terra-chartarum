import manifest from '../../public/geo/manifest.json';
import type { GeoLayer } from './geo';

type ReleaseAsset = (typeof manifest.assets)[number];

const byId = new Map<string, ReleaseAsset>(manifest.assets.map((asset) => [asset.id, asset]));

export const GEO_RELEASE = manifest.release;

export function geoReleaseAsset(id: string): ReleaseAsset {
  const asset = byId.get(id);
  if (!asset) throw new Error(`Geo layer "${id}" is missing from the release manifest`);
  return asset;
}

/** Content-addressed URL used by the atlas and safe for long-lived CDN caching. */
export function versionedGeoUrl(layer: Pick<GeoLayer, 'id' | 'url'>): string {
  const asset = geoReleaseAsset(layer.id);
  const expectedPath = `/geo/${asset.file}`;
  if (layer.url !== expectedPath) {
    throw new Error(`Geo layer "${layer.id}" URL ${layer.url} does not match ${expectedPath}`);
  }
  return asset.url;
}
