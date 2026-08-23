import { describe, it, expect } from 'vitest';
import { projectCatalogue, type CatalogueLayer } from './atlas-catalogue';
import {
  CATALOGUE_SIZES,
  realLayers,
  syntheticCollections,
  syntheticLayers,
} from '../test-support/catalogue-fixtures';

// Performance budgets for the catalogue (ATLAS-1211 / KAN-407).
//
// These are guard rails, not benchmarks: they exist to fail if an innocuous
// change turns the projection quadratic or starts shipping scholarly records per
// row. Numbers are recorded in docs/atlas-catalogue-performance.md; the budgets
// here are set well above the measured values so the suite is not a flake
// generator on a loaded CI box.

/** Milliseconds allowed to project a 200-layer catalogue. Measured at ~2ms. */
const PROJECTION_BUDGET_MS = 250;

/** Bytes allowed per client catalogue row. Measured at ~410. */
const ROW_BYTES_BUDGET = 900;

function build(count: number) {
  const layers = count === realLayers().length ? realLayers() : syntheticLayers(count);
  const collections = syntheticCollections(layers);
  return { layers, collections };
}

describe('the projection stays linear as the catalogue grows', () => {
  for (const size of CATALOGUE_SIZES) {
    it(`projects ${size.label} within budget`, () => {
      const { layers, collections } = build(size.count);
      const started = performance.now();
      const catalogue = projectCatalogue({
        availableLayerIds: layers.map((layer) => layer.id),
        releasedEssaySlugs: [],
        layers,
        collections,
      });
      const elapsed = performance.now() - started;
      expect(catalogue.layers.length).toBeGreaterThan(0);
      expect(elapsed, `${size.label} took ${elapsed.toFixed(1)}ms`).toBeLessThan(
        PROJECTION_BUDGET_MS,
      );
    });
  }

  it('does not degrade superlinearly between 100 and 200 layers', () => {
    const time = (count: number) => {
      const { layers, collections } = build(count);
      const started = performance.now();
      projectCatalogue({
        availableLayerIds: layers.map((l) => l.id),
        releasedEssaySlugs: [],
        layers,
        collections,
      });
      return performance.now() - started;
    };
    // Warm the JIT so the first call does not pay for both.
    time(100);
    const hundred = Math.max(time(100), 0.01);
    const twoHundred = time(200);
    // Doubling the catalogue may not more than sextuple the work. Generous,
    // because these are sub-millisecond numbers on a noisy machine - what it
    // actually catches is an accidental O(n^2).
    expect(twoHundred / hundred).toBeLessThan(6);
  });
});

describe('the client payload grows with the catalogue, not with the record', () => {
  it('ships a compact row rather than a scholarly record', () => {
    const { layers, collections } = build(200);
    const catalogue = projectCatalogue({
      availableLayerIds: layers.map((l) => l.id),
      releasedEssaySlugs: [],
      layers,
      collections,
    });
    const bytes = JSON.stringify(catalogue.layers).length;
    const perRow = bytes / catalogue.layers.length;
    expect(perRow, `${perRow.toFixed(0)} bytes per row`).toBeLessThan(ROW_BYTES_BUDGET);
  });

  it('carries no provenance, licence or documentation text on any row', () => {
    const { layers, collections } = build(200);
    const catalogue = projectCatalogue({
      availableLayerIds: layers.map((l) => l.id),
      releasedEssaySlugs: [],
      layers,
      collections,
    });
    const forbidden: (keyof CatalogueLayer | string)[] = [
      'source',
      'license',
      'attribution',
      'documentationLinks',
      'essayLinks',
      'graduate',
      'dash',
      'width',
    ];
    for (const row of catalogue.layers) {
      for (const key of forbidden) {
        expect(Object.keys(row), `${row.id}.${key}`).not.toContain(key);
      }
    }
  });
});

describe('one canonical layer registers once, however many lenses show it', () => {
  it('lists a layer in several lenses but keeps one row object', () => {
    const { layers, collections } = build(100);
    const catalogue = projectCatalogue({
      availableLayerIds: layers.map((l) => l.id),
      releasedEssaySlugs: [],
      layers,
      collections,
    });
    const sample = catalogue.layers[0];
    const appearances = (['themes', 'collections', 'rooms'] as const).filter((lens) =>
      catalogue.groups[lens].some((group) => group.layerIds.includes(sample.id)),
    );
    // It really is discoverable through more than one lens...
    expect(appearances.length).toBeGreaterThan(1);
    // ...and there is still exactly one row for it in the catalogue, so the
    // renderer can never be asked to add the same MapLibre source twice.
    expect(catalogue.layers.filter((row) => row.id === sample.id)).toHaveLength(1);
  });

  it('never repeats an ID within a single group', () => {
    const { layers, collections } = build(200);
    const catalogue = projectCatalogue({
      availableLayerIds: layers.map((l) => l.id),
      releasedEssaySlugs: [],
      layers,
      collections,
    });
    for (const lens of ['themes', 'collections', 'rooms'] as const) {
      for (const group of catalogue.groups[lens]) {
        expect(new Set(group.layerIds).size, `${lens}/${group.id}`).toBe(group.layerIds.length);
      }
    }
  });
});
