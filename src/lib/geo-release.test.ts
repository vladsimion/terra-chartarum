import { describe, expect, it } from 'vitest';
import { GEO_LAYERS } from './geo';
import { GEO_RELEASE, geoReleaseAsset, versionedGeoUrl } from './geo-release';

describe('versioned geo-layer release', () => {
  it('publishes every registered layer exactly once', () => {
    const assets = GEO_LAYERS.map((layer) => geoReleaseAsset(layer.id));
    expect(new Set(assets.map((asset) => asset.id)).size).toBe(GEO_LAYERS.length);
  });

  it('uses content hashes in layer and release versions', () => {
    expect(GEO_RELEASE).toMatch(/^geo-[a-f0-9]{16}$/);
    for (const layer of GEO_LAYERS) {
      const asset = geoReleaseAsset(layer.id);
      expect(asset.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(asset.version).toBe(asset.sha256.slice(0, 12));
      expect(versionedGeoUrl(layer)).toBe(`${layer.url}?v=${asset.version}`);
    }
  });

  it('keeps source, rights, CRS and temporal metadata aligned with the registry', () => {
    for (const layer of GEO_LAYERS) {
      const asset = geoReleaseAsset(layer.id);
      expect(asset.crs).toBe(layer.crs);
      expect(asset.source).toBe(layer.source);
      expect(asset.license).toBe(layer.license);
      expect(asset.attribution).toBe(layer.attribution);
      expect(asset.yearFrom).toBe(layer.yearFrom);
      expect(asset.yearTo).toBe(layer.yearTo);
    }
  });
});
