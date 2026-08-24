import { describe, expect, it } from 'vitest';
import {
  geoJsonBounds,
  resolveLayerBounds,
  resolveLayerRevealYear,
} from './atlas-layer-navigation';

describe('Atlas layer chronology', () => {
  it('uses an explicitly authored canonical reveal year', () => {
    expect(resolveLayerRevealYear({ yearFrom: 1200, yearTo: 1500, revealYear: 1400 })).toBe(1400);
  });

  it('otherwise uses the rounded midpoint of the declared range', () => {
    expect(resolveLayerRevealYear({ yearFrom: 1200, yearTo: 1501 })).toBe(1351);
  });
});

describe('Atlas layer bounds', () => {
  const geometry = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [12, 45] } },
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [-4, 40],
            [22, 51],
          ],
        },
      },
    ],
  };

  it('derives an envelope from nested GeoJSON coordinates', () => {
    expect(geoJsonBounds(geometry)).toEqual([
      [-4, 40],
      [22, 51],
    ]);
  });

  it('prefers authored bounds and returns null for empty geometry', () => {
    const authored = [
      [10, 30],
      [40, 50],
    ] as [[number, number], [number, number]];
    expect(
      resolveLayerBounds({ yearFrom: 1200, yearTo: 1500, fitBounds: authored }, geometry),
    ).toBe(authored);
    expect(geoJsonBounds({ type: 'FeatureCollection', features: [] })).toBeNull();
  });
});
