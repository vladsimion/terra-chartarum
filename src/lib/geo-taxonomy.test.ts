import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  GEO_LAYERS,
  GEO_LAYER_CATEGORIES,
  GEO_LAYER_LIFECYCLES,
  GEO_LAYER_ROLES,
  GeoLayerSchema,
} from './geo';

// The layer taxonomy (ATLAS-1201 / KAN-397). These tests exist so the catalogue,
// the collection registry (ATLAS-1202) and the inspector can rely on classification
// being present and honest instead of inferring it from titles or essay ownership.

/** A minimal entry that satisfies the base schema, for probing the taxonomy rules. */
function rawLayer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'probe-layer',
    title: 'Probe',
    description: 'A fixture used to exercise the taxonomy rules.',
    role: 'historical',
    category: 'territories-boundaries',
    kind: 'vector',
    format: 'geojson',
    url: '/geo/probe.geojson',
    yearFrom: 1200,
    yearTo: 1300,
    source: 'Terra Chartarum (fixture)',
    license: 'CC BY 4.0',
    attribution: 'Terra Chartarum',
    ...overrides,
  };
}

describe('GeoLayer taxonomy vocabularies', () => {
  it('exposes the canonical role, category and lifecycle vocabularies', () => {
    expect([...GEO_LAYER_ROLES]).toEqual(['context', 'historical', 'evidence', 'map-overlay']);
    expect([...GEO_LAYER_CATEGORIES]).toEqual([
      'territories-boundaries',
      'networks-circulation',
      'places-settlements',
      'names-peoples-attestations',
      'conflict-campaigns-frontiers',
      'cartographic-evidence',
      'historical-map-overlays',
    ]);
    expect([...GEO_LAYER_LIFECYCLES]).toEqual([
      'published',
      'in-review',
      'in-preparation',
      'planned',
    ]);
  });
});

describe('every registered layer is classified', () => {
  it('declares an explicit role from the vocabulary', () => {
    for (const layer of GEO_LAYERS) {
      expect(GEO_LAYER_ROLES, layer.id).toContain(layer.role);
    }
  });

  it('gives every non-context layer a canonical category', () => {
    for (const layer of GEO_LAYERS.filter((l) => l.role !== 'context')) {
      expect(layer.category, layer.id).toBeDefined();
      expect(GEO_LAYER_CATEGORIES, layer.id).toContain(layer.category);
    }
  });

  it('resolves a lifecycle from the vocabulary on every layer', () => {
    for (const layer of GEO_LAYERS) {
      expect(GEO_LAYER_LIFECYCLES, layer.id).toContain(layer.lifecycle);
    }
  });

  it('classifies modern national boundaries as context, not historical evidence', () => {
    const boundaries = GEO_LAYERS.find((l) => l.id === 'ne-boundaries');
    expect(boundaries?.role).toBe('context');
    expect(boundaries?.category).toBeUndefined();
    expect(boundaries?.subcategory).toBe('modern-reference');
  });

  it('keeps every context layer free of a historical category', () => {
    for (const layer of GEO_LAYERS.filter((l) => l.role === 'context')) {
      expect(layer.category, layer.id).toBeUndefined();
      expect(layer.subcategory, layer.id).toBeTruthy();
    }
  });

  it('files depicted extents and survey sheet indexes as cartographic evidence', () => {
    for (const id of ['map-coverage', 'dacia-josephinian-sheets']) {
      const layer = GEO_LAYERS.find((l) => l.id === id);
      expect(layer?.role, id).toBe('evidence');
      expect(layer?.category, id).toBe('cartographic-evidence');
    }
  });

  it('classifies the Hanseatic family as places, routes and events without a territory', () => {
    const byId = new Map(GEO_LAYERS.map((l) => [l.id, l]));
    expect(byId.get('hanseatic-places')?.category).toBe('places-settlements');
    expect(byId.get('hanseatic-routes')?.category).toBe('networks-circulation');
    expect(byId.get('hanseatic-events')?.category).toBe('places-settlements');
    expect(byId.get('hanseatic-events')?.subcategory).toBe('institutional-events');
    for (const id of ['hanseatic-places', 'hanseatic-routes', 'hanseatic-events']) {
      expect(byId.get(id)?.category, id).not.toBe('territories-boundaries');
    }
  });

  it('classifies CND attestations as names and peoples', () => {
    for (const id of ['dacia-attestations', 'dacia-attestations-research']) {
      expect(GEO_LAYERS.find((l) => l.id === id)?.category, id).toBe('names-peoples-attestations');
    }
  });
});

describe('taxonomy is additive: no stable contract changes', () => {
  // KAN-397 may reclassify, never rename. Every ID here is a public deep-link
  // target and a key into the release manifest.
  it('preserves the registered layer IDs exactly', () => {
    expect(GEO_LAYERS.map((l) => l.id)).toEqual([
      'ne-coastline',
      'ne-land',
      'ne-rivers',
      'ne-boundaries',
      'map-coverage',
      'roman-empire-117',
      'venetian-ports',
      'venetian-routes',
      'venetian-possessions',
      'hanseatic-places',
      'hanseatic-routes',
      'hanseatic-events',
      'dacia-attestations',
      'dacia-attestations-research',
      'dacia-roman-sites',
      'dacia-roman-network',
      'dacia-principalities',
      'dacia-josephinian-sheets',
      'dacia-treaty-frontiers',
      'antarctica-conjectured-south',
      'antarctica-expedition-tracks',
      'antarctica-observations',
      'antarctica-ghost-geographies',
      'crusades-itinerary',
      'crusades-fourth-crusade-routes',
      'crusades-fourth-crusade-events',
      'crusades-jerusalem-network',
    ]);
  });

  it('leaves the coastline the only default-on layer', () => {
    expect(GEO_LAYERS.filter((l) => l.defaultOn).map((l) => l.id)).toEqual(['ne-coastline']);
  });

  it('carries no global collection membership yet (ATLAS-1202 populates it)', () => {
    for (const layer of GEO_LAYERS) {
      expect(Array.isArray(layer.collectionIds), layer.id).toBe(true);
    }
  });
});

describe('discovery and ordering metadata', () => {
  it('orders the catalogue deterministically', () => {
    const weights = GEO_LAYERS.map((l) => l.sortWeight);
    expect(new Set(weights).size).toBe(weights.length);
  });

  it('authors search tags without touching display titles', () => {
    for (const layer of GEO_LAYERS) {
      expect(layer.tags.length, layer.id).toBeGreaterThan(0);
      expect(new Set(layer.tags).size, layer.id).toBe(layer.tags.length);
      for (const tag of layer.tags) {
        expect(tag, layer.id).toBe(tag.toLowerCase().trim());
        expect(tag.length, layer.id).toBeGreaterThan(0);
        expect(tag, layer.id).not.toBe(layer.title.toLowerCase());
      }
    }
  });

  it('keeps editorial prominence controlled and off the context layers', () => {
    const featured = GEO_LAYERS.filter((l) => l.featured);
    expect(featured.length).toBeGreaterThan(0);
    expect(featured.length).toBeLessThanOrEqual(6);
    for (const layer of featured) {
      expect(layer.role, layer.id).not.toBe('context');
      expect(layer.lifecycle, layer.id).toBe('published');
    }
  });
});

describe('lifecycle is editorial state, not asset availability', () => {
  it('keeps the reviewed CND layer published while its asset is still empty', async () => {
    const layer = GEO_LAYERS.find((l) => l.id === 'dacia-attestations');
    expect(layer?.lifecycle).toBe('published');
    const asset = JSON.parse(
      await readFile(join(process.cwd(), 'public', 'geo', 'dacia-attestations.geojson'), 'utf8'),
    );
    expect(asset.features).toHaveLength(0);
  });

  it('marks the unreviewed research tier in-review even though its asset ships', () => {
    expect(GEO_LAYERS.find((l) => l.id === 'dacia-attestations-research')?.lifecycle).toBe(
      'in-review',
    );
  });
});

describe('the schema rejects invalid or incomplete taxonomy', () => {
  it('rejects an unknown role', () => {
    expect(() => GeoLayerSchema.parse(rawLayer({ role: 'decorative' }))).toThrow();
  });

  it('rejects an unknown category', () => {
    expect(() => GeoLayerSchema.parse(rawLayer({ category: 'miscellaneous' }))).toThrow();
  });

  it('rejects an unknown lifecycle', () => {
    expect(() => GeoLayerSchema.parse(rawLayer({ lifecycle: 'draft' }))).toThrow();
  });

  it('rejects a historical layer with no category', () => {
    expect(() => GeoLayerSchema.parse(rawLayer({ category: undefined }))).toThrow(
      /must declare a canonical category/,
    );
  });

  it('rejects an evidence layer with no category', () => {
    expect(() => GeoLayerSchema.parse(rawLayer({ role: 'evidence', category: undefined }))).toThrow(
      /must declare a canonical category/,
    );
  });

  it('rejects a context layer that claims a historical category', () => {
    expect(() => GeoLayerSchema.parse(rawLayer({ role: 'context' }))).toThrow(
      /must not declare a historical category/,
    );
  });

  it('accepts a context layer that groups itself with a subcategory', () => {
    const layer = GeoLayerSchema.parse(
      rawLayer({ role: 'context', category: undefined, subcategory: 'physical-geography' }),
    );
    expect(layer.subcategory).toBe('physical-geography');
  });

  it('rejects a map overlay filed outside the overlay category without justification', () => {
    expect(() =>
      GeoLayerSchema.parse(rawLayer({ role: 'map-overlay', category: 'places-settlements' })),
    ).toThrow(/must use historical-map-overlays or declare a categoryException/);
  });

  it('accepts a justified map-overlay exception', () => {
    const layer = GeoLayerSchema.parse(
      rawLayer({
        role: 'map-overlay',
        category: 'places-settlements',
        categoryException: 'City plan overlay read as a settlement source, not as a base map.',
      }),
    );
    expect(layer.categoryException).toBeTruthy();
  });

  it('rejects a categoryException on a layer that is not a map overlay', () => {
    expect(() =>
      GeoLayerSchema.parse(rawLayer({ categoryException: 'no reason to be here' })),
    ).toThrow(/is not a map overlay/);
  });

  it('defaults the discovery fields so an unclassified-but-valid entry still parses', () => {
    const layer = GeoLayerSchema.parse(rawLayer());
    expect(layer.collectionIds).toEqual([]);
    expect(layer.tags).toEqual([]);
    expect(layer.featured).toBe(false);
    expect(layer.sortWeight).toBe(0);
    expect(layer.lifecycle).toBe('published');
  });
});
