import { describe, it, expect } from 'vitest';
import {
  GEO_COLLECTIONS,
  GeoCollectionSchema,
  collectionExtent,
  collectionsForLayer,
  getGeoCollection,
} from './geo-collections';
import { GEO_LAYERS } from './geo';

// A collection is an editorial bundle over canonical layer IDs (ATLAS-1202 /
// KAN-398). These tests hold the two lines that matter: it never copies layer
// data, and it never quietly contradicts the layers it bundles.

function rawCollection(overrides: Record<string, unknown> = {}) {
  return {
    id: 'probe-collection',
    title: 'Probe',
    summary: 'A fixture used to exercise the collection rules.',
    layerIds: ['venetian-ports', 'venetian-routes'],
    defaultLayerIds: ['venetian-ports'],
    ...overrides,
  };
}

describe('the seed collections validate against published layers', () => {
  it('registers the collections in deterministic order', () => {
    expect(GEO_COLLECTIONS.map((c) => c.id)).toEqual([
      'venetian-maritime-network',
      'hanseatic-world',
      'corpus-chartarum-daciae',
      'roman-geography',
      'terra-incognita',
    ]);
  });

  it('resolves every member to a registered layer', () => {
    const ids = new Set(GEO_LAYERS.map((l) => l.id));
    for (const collection of GEO_COLLECTIONS) {
      for (const layerId of collection.layerIds) {
        expect(ids.has(layerId), `${collection.id} / ${layerId}`).toBe(true);
      }
    }
  });

  it('keeps every default a member of its own collection', () => {
    for (const collection of GEO_COLLECTIONS) {
      for (const layerId of collection.defaultLayerIds) {
        expect(collection.layerIds, collection.id).toContain(layerId);
      }
    }
  });

  it('gives a collection a default only when it has something published to show', () => {
    // A collection of layers that are all still in review has no legitimate
    // default: activating one would put unreviewed material in front of a
    // reader who merely opened the collection. A collection with a published
    // member owes a default, because a control that does nothing is broken.
    const lifecycles = new Map(GEO_LAYERS.map((l) => [l.id, l.lifecycle]));
    for (const collection of GEO_COLLECTIONS) {
      const hasPublished = collection.layerIds.some((id) => lifecycles.get(id) === 'published');
      expect(collection.defaultLayerIds.length > 0, collection.id).toBe(hasPublished);
    }
  });

  it('duplicates no layer data - a collection holds IDs and nothing else', () => {
    for (const collection of GEO_COLLECTIONS) {
      const json = JSON.stringify(collection);
      expect(json, collection.id).not.toContain('/geo/');
      expect(json, collection.id).not.toContain('geojson');
      expect(json, collection.id).not.toContain('flatgeobuf');
    }
  });

  it('leaks no essay title or anchor, only slugs the release gate can filter', () => {
    for (const collection of GEO_COLLECTIONS) {
      for (const slug of collection.essaySlugs) {
        expect(slug, collection.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      }
      expect(Object.keys(collection), collection.id).not.toContain('essayLinks');
    }
  });
});

describe('membership is many-to-many without duplication', () => {
  it('lets one layer belong to two collections', () => {
    const both = collectionsForLayer('dacia-roman-sites').map((c) => c.id);
    expect(both).toEqual(['corpus-chartarum-daciae', 'roman-geography']);
  });

  it('reports no collections for a layer nothing bundles', () => {
    expect(collectionsForLayer('ne-coastline')).toEqual([]);
  });
});

describe('defaults belong to the collection, not to the layer', () => {
  it('gives the same layer different default state in different collections', () => {
    // dacia-roman-sites is off by default in the Dacia programme collection and
    // absent from the Roman defaults - the layer itself says nothing either way.
    expect(getGeoCollection('corpus-chartarum-daciae')?.defaultLayerIds).not.toContain(
      'dacia-roman-sites',
    );
    expect(getGeoCollection('roman-geography')?.defaultLayerIds).toEqual(['roman-empire-117']);
  });

  it('never activates an unpublished layer by default', () => {
    const lifecycles = new Map(GEO_LAYERS.map((l) => [l.id, l.lifecycle]));
    for (const collection of GEO_COLLECTIONS) {
      for (const layerId of collection.defaultLayerIds) {
        expect(lifecycles.get(layerId), `${collection.id} / ${layerId}`).toBe('published');
      }
    }
  });

  it('keeps the unreviewed CND research tier a member but never a default', () => {
    const ccd = getGeoCollection('corpus-chartarum-daciae')!;
    expect(ccd.layerIds).toContain('dacia-attestations-research');
    expect(ccd.defaultLayerIds).not.toContain('dacia-attestations-research');
  });
});

describe('temporal extent is derived unless an override argues for itself', () => {
  it('derives the envelope from members when nothing is declared', () => {
    const vmn = getGeoCollection('venetian-maritime-network')!;
    expect(vmn.yearFrom).toBeUndefined();
    expect(collectionExtent(vmn)).toEqual({ from: 1200, to: 1500 });
  });

  it('honours an explicit narrowing and records the reason', () => {
    const roman = getGeoCollection('roman-geography')!;
    expect(collectionExtent(roman)).toEqual({ from: 106, to: 271 });
    expect(roman.temporalNote).toBeTruthy();
  });

  it('rejects an override that gives one bound only', () => {
    expect(() => GeoCollectionSchema.parse(rawCollection({ yearFrom: 1300 }))).toThrow(
      /both temporal bounds or neither/,
    );
  });

  it('rejects an unexplained override', () => {
    expect(() =>
      GeoCollectionSchema.parse(rawCollection({ yearFrom: 1300, yearTo: 1400 })),
    ).toThrow(/must say why/);
  });

  it('rejects a note that explains an override nobody made', () => {
    expect(() =>
      GeoCollectionSchema.parse(rawCollection({ temporalNote: 'narrowed for no reason' })),
    ).toThrow(/does not make/);
  });

  it('rejects an inverted range', () => {
    expect(() =>
      GeoCollectionSchema.parse(
        rawCollection({ yearFrom: 1400, yearTo: 1300, temporalNote: 'backwards' }),
      ),
    ).toThrow(/ends before it begins/);
  });
});

describe('the schema rejects incoherent bundles', () => {
  it('rejects a default that is not a member', () => {
    expect(() =>
      GeoCollectionSchema.parse(rawCollection({ defaultLayerIds: ['ne-coastline'] })),
    ).toThrow(/defaults to non-member/);
  });

  it('rejects a repeated member', () => {
    expect(() =>
      GeoCollectionSchema.parse(rawCollection({ layerIds: ['venetian-ports', 'venetian-ports'] })),
    ).toThrow(/repeats a member layer/);
  });

  it('rejects a repeated default', () => {
    expect(() =>
      GeoCollectionSchema.parse(
        rawCollection({ defaultLayerIds: ['venetian-ports', 'venetian-ports'] }),
      ),
    ).toThrow(/repeats a default layer/);
  });

  it('rejects an empty collection', () => {
    expect(() => GeoCollectionSchema.parse(rawCollection({ layerIds: [] }))).toThrow();
  });

  it('accepts a collection with no defaults at all', () => {
    const collection = GeoCollectionSchema.parse(rawCollection({ defaultLayerIds: [] }));
    expect(collection.defaultLayerIds).toEqual([]);
  });
});

describe('adding a collection is data authoring, not a code change', () => {
  it('requires only registry fields, with everything else defaulted', () => {
    const collection = GeoCollectionSchema.parse({
      id: 'mediterranean-networks',
      title: 'Mediterranean networks',
      summary: 'A future bundle authored without touching the browser.',
      layerIds: ['venetian-routes', 'hanseatic-routes'],
    });
    expect(collection.defaultLayerIds).toEqual([]);
    expect(collection.tags).toEqual([]);
    expect(collection.secondaryRooms).toEqual([]);
    expect(collection.featured).toBe(false);
    expect(collection.sortWeight).toBe(0);
  });
});
