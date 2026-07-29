import { describe, expect, it } from 'vitest';
import {
  getToponyms,
  toLinkedPlacesCollection,
  toponymAuthorityLinks,
  toponymNames,
} from './toponyms';

describe('Linked Places gazetteer', () => {
  const toponyms = getToponyms();
  const collection = toLinkedPlacesCollection(
    toponyms,
    'https://example.test/geo/toponyms.lpf.json',
  );

  it('exports every authored place as a named GeoJSON-LD feature', () => {
    expect(collection.type).toBe('FeatureCollection');
    expect(collection.features).toHaveLength(toponyms.length);

    for (const [index, feature] of collection.features.entries()) {
      const source = toponyms[index];
      expect(feature['@id']).toBe(
        `https://example.test/geo/toponyms.lpf.json#${encodeURIComponent(source.id)}`,
      );
      expect(feature.geometry.coordinates).toEqual(source.coords);
      expect(feature.names.map(({ toponym }) => toponym)).toEqual(toponymNames(source));
    }
  });

  it('publishes only exact, HTTPS authority matches', () => {
    const links = toponyms.flatMap(toponymAuthorityLinks);
    expect(links.length).toBeGreaterThan(0);
    expect(links.every(({ type }) => type === 'closeMatch')).toBe(true);
    expect(links.every(({ identifier }) => identifier.startsWith('https://'))).toBe(true);
    expect(links.some(({ identifier }) => identifier.includes('pleiades.stoa.org'))).toBe(true);
    expect(links.some(({ identifier }) => identifier.includes('w3id.org/whg'))).toBe(true);
  });

  it('declares the reconciliation ecosystems without fabricating per-place matches', () => {
    expect(collection._terraChartarum.reconciliation).toEqual([
      'World Historical Gazetteer',
      'Pleiades',
      'Pelagios / Peripleo',
    ]);
  });
});
