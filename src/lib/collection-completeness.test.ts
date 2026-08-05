import { describe, expect, it } from 'vitest';
import { HistoricalMapSchema } from './corpus';
import { analyseCollectionCompleteness, COMPLETENESS_CRITERIA } from './collection-completeness';

const complete = HistoricalMapSchema.parse({
  id: 'complete',
  title: 'Complete map',
  year: 1500,
  essaySlug: 'live-essay',
  region: 'Europe',
  coords: [0, 0],
  cartographerId: 'maker',
  dimensions: '10 × 20 cm',
  provenance: 'Known collection',
  bibliography: ['source'],
  images: [{ src: '/map.jpg', alt: 'Map', credit: 'Archive', license: 'CC BY' }],
  room: 'map',
  coveragePath: '/geo/coverage.geojson#complete',
});

const sparse = HistoricalMapSchema.parse({
  id: 'sparse',
  title: 'Sparse map',
  year: 1600,
  essaySlug: 'held-essay',
  region: 'Europe',
  coords: [1, 1],
});

describe('analyseCollectionCompleteness', () => {
  it('reports every criterion without turning incompleteness into a build failure', () => {
    const report = analyseCollectionCompleteness([complete, sparse], new Set(['live-essay']));
    expect(report.mapCount).toBe(2);
    expect(report.criterionCount).toBe(COMPLETENESS_CRITERIA.length);
    expect(report.records[0]).toMatchObject({ id: 'complete', percent: 100, missing: [] });
    expect(report.records[1].missing).toEqual(COMPLETENESS_CRITERIA);
    expect(report.percent).toBe(50);
  });

  it('sorts live-essay records first, then by lowest completeness', () => {
    const partial = HistoricalMapSchema.parse({
      ...sparse,
      id: 'partial',
      title: 'Partial map',
      essaySlug: 'live-essay',
      room: 'map',
    });
    const report = analyseCollectionCompleteness(
      [sparse, complete, partial],
      new Set(['live-essay']),
    );
    expect(report.records.map(({ id }) => id)).toEqual(['partial', 'complete', 'sparse']);
  });
});
