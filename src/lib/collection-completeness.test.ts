import { describe, expect, it } from 'vitest';
import { HistoricalMapSchema } from './corpus';
import {
  analyseCollectionCompleteness,
  COMPLETENESS_CRITERIA,
  OBJECT_AUDIT_CRITERIA,
} from './collection-completeness';

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
    expect(report.schemaVersion).toBe(2);
    expect(report.mapCount).toBe(2);
    expect(report.criterionCount).toBe(COMPLETENESS_CRITERIA.length);
    expect(report.records[0]).toMatchObject({ id: 'complete', percent: 100, missing: [] });
    expect(report.records[1].missing).toEqual(COMPLETENESS_CRITERIA);
    expect(report.percent).toBe(50);
    expect(report.objectAudit.criterionCount).toBe(OBJECT_AUDIT_CRITERIA.length);
    expect(report.records[0].canonicalId).toBe('tc:atlas:map:complete');
    expect(report.records[0].audit.verso).toBe('not_yet_verified');
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

  it('classifies every record and produces bounded programme-owned queues', () => {
    const dacia = HistoricalMapSchema.parse({
      ...sparse,
      id: 'specht-dacia',
      title: 'Map of Dacia',
      essaySlug: 'dacia',
    });
    const holyLand = HistoricalMapSchema.parse({
      ...sparse,
      id: 'matthew-paris',
      title: 'Matthew Paris itinerary to Jerusalem',
      essaySlug: 'religion',
    });
    const report = analyseCollectionCompleteness(
      [dacia, holyLand, complete],
      new Set(['dacia', 'religion', 'live-essay']),
    );

    expect(report.records.find(({ id }) => id === 'specht-dacia')?.enrichmentTrack).toBe(
      'dacia_in_manibus',
    );
    expect(report.records.find(({ id }) => id === 'matthew-paris')?.enrichmentTrack).toBe(
      'crusades_holy_land',
    );
    expect(report.enrichmentQueue.map(({ owner }) => owner)).toEqual([
      'KAN-360 / KAN-361',
      'KAN-391',
      'KAN-392',
    ]);
    expect(report.enrichmentQueue.every((queue) => queue.records.length <= queue.limit)).toBe(true);
  });
});
