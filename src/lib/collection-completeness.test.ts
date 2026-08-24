import { describe, expect, it } from 'vitest';
import {
  CatalogueUncertaintySchema,
  HistoricalMapSchema,
  PhysicalObservationSchema,
} from './corpus';
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

describe('physical observation is separated from bibliographic inference (KAN-391)', () => {
  const base = {
    id: 'test-object',
    title: 'A sheet',
    year: 1600,
    essaySlug: 'cartography',
    region: 'Europe',
    coords: [0, 0] as [number, number],
    bibliography: [],
    relatedMapIds: [],
    relatedEssaySlugs: [],
    images: [],
    tags: [],
    uncertainties: [],
    secondaryRooms: [],
    roomAnchor: false,
  };

  it('records verso only from an examination, never from a catalogue phrase', () => {
    const unexamined = analyseCollectionCompleteness([{ ...base }], new Set(['cartography']));
    expect(unexamined.records[0].audit.verso).toBe('not_yet_verified');

    const examined = analyseCollectionCompleteness(
      [
        {
          ...base,
          physicalObservation: {
            verso: 'Blank, with a nineteenth-century collector’s stamp lower left.',
            observedBy: 'A Cataloguer',
            observedOn: '2026-08-24',
            basis: 'object_in_hand' as const,
          },
        },
      ],
      new Set(['cartography']),
    );
    expect(examined.records[0].audit.verso).toBe('recorded');
  });

  it('lets an examination override the colour inferred from the medium', () => {
    // "hand-coloured" in a dealer description is a claim about the object, not
    // a look at it. The inference stays as a fallback; it must not outrank a
    // person who saw the sheet.
    const inferred = analyseCollectionCompleteness(
      [{ ...base, medium: 'copper engraving, hand-coloured' }],
      new Set(['cartography']),
    );
    expect(inferred.records[0].audit.colour).toBe('recorded');

    const seen = analyseCollectionCompleteness(
      [
        {
          ...base,
          physicalObservation: {
            colour: 'Outline colour, later than publication.',
            observedBy: 'A Cataloguer',
            observedOn: '2026-08-24',
            basis: 'object_in_hand' as const,
          },
        },
      ],
      new Set(['cartography']),
    );
    expect(seen.records[0].audit.colour).toBe('recorded');
  });

  it('refuses an observation that names no observer', () => {
    expect(() =>
      PhysicalObservationSchema.parse({
        verso: 'Blank.',
        basis: 'object_in_hand',
      }),
    ).toThrow();

    expect(() =>
      PhysicalObservationSchema.parse({
        verso: 'Blank.',
        observedBy: 'A Cataloguer',
        observedOn: 'sometime in 2026',
        basis: 'object_in_hand',
      }),
    ).toThrow();
  });

  it('keeps an unresolved question as a statement rather than an absence', () => {
    const parsed = CatalogueUncertaintySchema.parse({
      field: 'state',
      question: 'Second or third state: the plate crack is not visible in this impression.',
      wouldResolve: 'Collation against the Van der Krogt census.',
    });
    expect(parsed.field).toBe('state');
    // Both halves are required: a question with no route to an answer is a
    // complaint, not verification debt.
    expect(() =>
      CatalogueUncertaintySchema.parse({ field: 'state', question: 'Which state?' }),
    ).toThrow();
  });
});
