import { describe, expect, it } from 'vitest';
import { CANONICAL_DIMENSIONS } from '../content/config';
import {
  assertEssayLensCoverage,
  auditLensCoverage,
  mappedNativeAxes,
  type LensAuditEssay,
} from './registry';

const scores = Object.fromEntries(CANONICAL_DIMENSIONS.map((dimension) => [dimension, 0.5]));

const inventory: LensAuditEssay[] = [
  {
    slug: 'cartography',
    lenses: [
      'Accuracy',
      'Usability',
      'Navigation',
      'Symbolism',
      'Politics',
      'Completeness',
      'Richness',
    ],
    metaScores: scores,
  },
  {
    slug: 'dacia',
    lenses: ['mensvra', 'auctoritas', 'nomina', 'limes', 'silentium'],
    metaScores: scores,
  },
  {
    slug: 'speculum',
    lenses: ['Geodesy', 'Witness', 'Cosmos', 'Fitness', 'Reach', 'Hand'],
    metaScores: scores,
  },
  {
    slug: 'venice-sicily',
    lenses: ['MARE', 'TERRA', 'RETE', 'CONFINE', 'CIRCOLAZIONE', 'IMPOSIZIONE'],
    metaScores: scores,
  },
  {
    slug: 'invisible-maps-trade',
    lenses: ['Network', 'Jurisdiction', 'Schedule', 'Labour', 'Commodity', 'Silence'],
    metaScores: scores,
  },
  {
    slug: 'maps-that-age',
    lenses: ['Plate', 'State', 'Edition', 'Wear', 'Revision', 'Archive'],
    metaScores: scores,
  },
  {
    slug: 'invisible-maps-religion',
    lenses: ['Sacred centre', 'Orientation', 'Pilgrimage', 'Memory', 'Diagram', 'Print'],
    metaScores: scores,
  },
  {
    slug: 'cities-remember',
    lenses: ['Fragment', 'View', 'Wall', 'Ground', 'Risk', 'Registration'],
    metaScores: scores,
  },
  {
    slug: 'the-shape-of-a-civilization',
    lenses: ['Terrain', 'Settlement', 'Network', 'Ecology', 'Territory'],
    metaScores: scores,
  },
  {
    slug: 'the-cartography-of-empire',
    lenses: ['Empire', 'Administration', 'Boundary', 'Atlas', 'Classification'],
    metaScores: scores,
  },
  {
    slug: 'when-maps-create-countries',
    lenses: ['Nation', 'Survey', 'Schooling', 'Repetition', 'Boundary'],
    metaScores: scores,
  },
  {
    slug: 'projection-and-perspective',
    lenses: ['Projection', 'Perspective', 'Distortion', 'Scale', 'Viewpoint'],
    metaScores: scores,
  },
  {
    slug: 'the-geography-of-power',
    lenses: ['Jurisdiction', 'Infrastructure', 'Access', 'Property', 'Refusal'],
    metaScores: scores,
  },
  {
    slug: 'invisible-maps-of-migration',
    lenses: ['Movement', 'Archive', 'Border', 'Uncertainty', 'Diaspora'],
    metaScores: scores,
  },
  {
    slug: 'palimpsest-landscapes',
    lenses: ['Landscape', 'Archaeology', 'Survey', 'Memory', 'Reconstruction'],
    metaScores: scores,
  },
  {
    slug: 'classification-is-cartography',
    lenses: ['Classification', 'Catalogue', 'Taxonomy', 'Search', 'Uncertainty'],
    metaScores: scores,
  },
  {
    slug: 'starter-example',
    lenses: ['Measure', 'Witness', 'Use', 'Cosmos', 'Power', 'Silence'],
    metaScores: scores,
  },
];

describe('meta-lens coverage', () => {
  it('covers every declared native axis in the complete essay inventory', () => {
    expect(auditLensCoverage(inventory)).toEqual({
      missingMappings: [],
      duplicateLabels: [],
      invalidMappings: [],
      invalidNormalization: [],
    });
  });

  it('reports missing mappings, duplicate labels, and invalid normalization', () => {
    const audit = auditLensCoverage([
      {
        slug: 'broken',
        lenses: ['Accuracy', 'Accuracy', 'Unknown axis'],
        metaScores: { ...scores, measure: 2 },
      },
    ]);

    expect(audit.missingMappings).toEqual([{ slug: 'broken', axis: 'Unknown axis' }]);
    expect(audit.duplicateLabels).toEqual([{ slug: 'broken', axis: 'Accuracy' }]);
    expect(audit.invalidNormalization).toContainEqual({
      slug: 'broken',
      dimension: 'measure',
      value: 2,
    });
  });

  it('preserves native labels while exposing weighted canonical targets', () => {
    expect(mappedNativeAxes(['Completeness'])).toEqual([
      {
        axis: 'Completeness',
        mappings: [
          { dimension: 'witness', label: 'Witness', weight: 0.5 },
          { dimension: 'silence', label: 'Silence', weight: -0.5 },
        ],
      },
    ]);
  });

  it('fails the rendering gate when an essay is not completely mapped', () => {
    expect(() =>
      assertEssayLensCoverage({
        slug: 'unmapped',
        lenses: ['No such lens'],
        metaScores: scores,
      }),
    ).toThrow("unmapped axis 'No such lens'");
  });
});
