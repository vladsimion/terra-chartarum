import { describe, it, expect } from 'vitest';
import { GEO_LAYERS, type GeoLayer } from './geo';
import {
  CONTEXT_GROUP_ID,
  auditCatalogueAvailability,
  projectCatalogue,
  type AtlasLens,
} from './atlas-catalogue';
import type { GeoCollection } from './geo-collections';

// The catalogue has to stay navigable well past the nineteen layers that exist
// today (ATLAS-1204 / KAN-400), and lifecycle has to stay separable from asset
// availability under load (ATLAS-1208 / KAN-404).

const CATEGORIES = [
  'territories-boundaries',
  'networks-circulation',
  'places-settlements',
  'names-peoples-attestations',
  'conflict-campaigns-frontiers',
] as const;

const ROOMS = ['earth', 'border', 'road', 'archive', 'map', 'city'] as const;

/** A synthetic catalogue of `count` layers spread across categories and rooms. */
function syntheticLayers(count: number): GeoLayer[] {
  const template = GEO_LAYERS.find((layer) => layer.id === 'roman-empire-117')!;
  return Array.from({ length: count }, (_, index) => ({
    ...template,
    id: `synthetic-${String(index).padStart(3, '0')}`,
    title: `Synthetic layer ${index}`,
    category: CATEGORIES[index % CATEGORIES.length],
    subcategory: `family-${index % 7}`,
    room: ROOMS[index % ROOMS.length],
    secondaryRooms: [],
    tags: [`tag-${index % 11}`, 'synthetic'],
    sortWeight: 1000 + index,
    yearFrom: 100 + index,
    yearTo: 1900,
  }));
}

function syntheticCollections(layers: GeoLayer[], size: number): GeoCollection[] {
  const collections: GeoCollection[] = [];
  for (let index = 0; index * size < layers.length; index += 1) {
    const members = layers.slice(index * size, index * size + size);
    collections.push({
      id: `synthetic-collection-${index}`,
      title: `Synthetic collection ${index}`,
      summary: 'A generated bundle.',
      layerIds: members.map((layer) => layer.id),
      defaultLayerIds: members.slice(0, 2).map((layer) => layer.id),
      secondaryRooms: [],
      essaySlugs: [],
      tags: [],
      featured: false,
      sortWeight: index,
    } as GeoCollection);
  }
  return collections;
}

describe('a 200-layer catalogue stays a browsable structure', () => {
  const layers = syntheticLayers(200);
  const collections = syntheticCollections(layers, 8);
  const catalogue = projectCatalogue({
    availableLayerIds: layers.map((layer) => layer.id),
    releasedEssaySlugs: [],
    layers,
    collections,
  });

  it('projects every layer exactly once', () => {
    expect(catalogue.layers).toHaveLength(200);
    expect(new Set(catalogue.layers.map((row) => row.id)).size).toBe(200);
  });

  it('breaks the catalogue into groups rather than one unbroken list', () => {
    for (const lens of ['themes', 'collections', 'rooms'] as AtlasLens[]) {
      const groups = catalogue.groups[lens];
      expect(groups.length, lens).toBeGreaterThan(1);
      const largest = Math.max(...groups.map((group) => group.layerIds.length));
      // No single group may be most of the catalogue, or the browser has simply
      // moved the unbroken list one level down.
      expect(largest, lens).toBeLessThan(catalogue.layers.length / 2);
    }
  });

  it('reaches the same canonical IDs through all three lenses', () => {
    const ids = (lens: AtlasLens) =>
      new Set(catalogue.groups[lens].flatMap((group) => group.layerIds));
    const themes = ids('themes');
    expect(ids('rooms')).toEqual(themes);
    expect(ids('collections')).toEqual(themes);
  });

  it('sorts deterministically and identically on a second projection', () => {
    const again = projectCatalogue({
      availableLayerIds: layers.map((layer) => layer.id),
      releasedEssaySlugs: [],
      layers,
      collections,
    });
    expect(again.layers.map((row) => row.id)).toEqual(catalogue.layers.map((row) => row.id));
  });

  it('gives every row a search haystack so a name is reachable without browsing', () => {
    const hit = catalogue.layers.filter((row) => row.searchText.includes('tag-3'));
    expect(hit.length).toBeGreaterThan(0);
    expect(hit.length).toBeLessThan(catalogue.layers.length);
  });

  it('keeps the context group last when context layers are present', () => {
    const withContext = projectCatalogue({
      availableLayerIds: [...layers, ...GEO_LAYERS].map((layer) => layer.id),
      releasedEssaySlugs: [],
      layers: [...layers, ...GEO_LAYERS],
      collections,
    });
    expect(withContext.groups.themes.at(-1)!.id).toBe(CONTEXT_GROUP_ID);
  });
});

describe('lifecycle and availability stay separable at scale', () => {
  const layers = syntheticLayers(60);

  it('reports every published layer whose asset is missing, by name', () => {
    const missing = layers.slice(0, 5).map((layer) => layer.id);
    const catalogue = projectCatalogue({
      availableLayerIds: layers.map((l) => l.id).filter((id) => !missing.includes(id)),
      releasedEssaySlugs: [],
      layers,
      collections: [],
    });
    const defects = auditCatalogueAvailability(catalogue);
    expect(defects).toHaveLength(5);
    for (const id of missing) {
      expect(
        defects.some((defect) => defect.includes(id)),
        id,
      ).toBe(true);
    }
  });

  it('lets planned and in-preparation layers lack an asset without complaint', () => {
    const pending = layers.map((layer, index) => {
      if (index >= 10) return layer;
      const lifecycle: GeoLayer['lifecycle'] = index % 2 ? 'planned' : 'in-preparation';
      return { ...layer, lifecycle };
    });
    const catalogue = projectCatalogue({
      availableLayerIds: pending.slice(10).map((layer) => layer.id),
      releasedEssaySlugs: [],
      layers: pending,
      collections: [],
    });
    expect(auditCatalogueAvailability(catalogue)).toEqual([]);
    // ...and they never reach the live browser, so there is no long tail of
    // disabled rows standing in for work nobody has started.
    expect(catalogue.layers).toHaveLength(50);
  });

  it('never offers an activation control that resolves to nothing', () => {
    const collections = syntheticCollections(layers, 5);
    const catalogue = projectCatalogue({
      // Only the first collection's members are available.
      availableLayerIds: layers.slice(0, 5).map((layer) => layer.id),
      releasedEssaySlugs: [],
      layers,
      collections,
    });
    expect(catalogue.collections).toHaveLength(1);
    for (const collection of catalogue.collections) {
      expect(collection.availableLayerIds.length, collection.id).toBeGreaterThan(0);
      expect(collection.defaultLayerIds.length, collection.id).toBeGreaterThan(0);
    }
  });
});
