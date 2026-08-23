/**
 * Deterministic synthetic catalogue fixtures (ATLAS-1211 / KAN-407).
 *
 * The registry holds nineteen layers today and the architecture is meant to
 * carry two hundred. Proving that needs a catalogue of that size, and it must
 * not need two hundred real GIS binaries: these fixtures exercise the metadata
 * the browser actually works on - roles, categories, rooms, collections,
 * lifecycles, geometry types, temporal ranges and facets - while reusing one
 * real layer's rendering contract.
 *
 * Deterministic by construction: same input, same catalogue, so a measurement
 * taken today is comparable with one taken next year.
 */
import { GEO_LAYERS, type GeoLayer, type GeoLayerCategory } from '../lib/geo';
import type { GeoCollection } from '../lib/geo-collections';

const CATEGORIES: GeoLayerCategory[] = [
  'territories-boundaries',
  'networks-circulation',
  'places-settlements',
  'names-peoples-attestations',
  'conflict-campaigns-frontiers',
  'cartographic-evidence',
];

const ROOMS = ['earth', 'border', 'road', 'archive', 'map', 'city', 'theatre'] as const;
const GEOMETRIES = ['line', 'fill', 'circle'] as const;
const LIFECYCLES = ['published', 'published', 'published', 'in-review'] as const;
const FACETS = ['confidence', 'source_id', 'feature_type', 'review_status'];

/** The real catalogue, for a baseline measurement. */
export function realLayers(): GeoLayer[] {
  return GEO_LAYERS;
}

export function syntheticLayers(count: number): GeoLayer[] {
  const template = GEO_LAYERS.find((layer) => layer.id === 'roman-empire-117')!;
  return Array.from({ length: count }, (_, index) => ({
    ...template,
    id: `synthetic-${String(index).padStart(3, '0')}`,
    title: `Synthetic layer ${index}`,
    description: `A generated layer used to size the catalogue, number ${index}.`,
    role: 'historical' as const,
    category: CATEGORIES[index % CATEGORIES.length],
    subcategory: `family-${index % 9}`,
    room: ROOMS[index % ROOMS.length],
    secondaryRooms: [],
    tags: [`tag-${index % 13}`, `programme-${index % 5}`, 'synthetic'],
    lifecycle: LIFECYCLES[index % LIFECYCLES.length],
    geometry: GEOMETRIES[index % GEOMETRIES.length],
    facets: FACETS.slice(0, (index % FACETS.length) + 1),
    sortWeight: 1000 + index,
    yearFrom: -500 + index * 10,
    yearTo: 500 + index * 10,
  }));
}

export function syntheticCollections(layers: GeoLayer[], size = 8): GeoCollection[] {
  const collections: GeoCollection[] = [];
  for (let index = 0; index * size < layers.length; index += 1) {
    const members = layers.slice(index * size, index * size + size);
    if (members.length === 0) continue;
    collections.push({
      id: `synthetic-collection-${String(index).padStart(3, '0')}`,
      title: `Synthetic collection ${index}`,
      summary: 'A generated bundle used to size the collections lens.',
      layerIds: members.map((layer) => layer.id),
      defaultLayerIds: members
        .filter((layer) => layer.lifecycle === 'published')
        .slice(0, 2)
        .map((layer) => layer.id),
      secondaryRooms: [],
      essaySlugs: [],
      tags: [`bundle-${index % 7}`],
      featured: index === 0,
      sortWeight: index,
    } as GeoCollection);
  }
  return collections;
}

/** The three sizes KAN-407 measures against. */
export const CATALOGUE_SIZES = [
  { label: 'current', count: GEO_LAYERS.length },
  { label: '100 layers', count: 100 },
  { label: '200 layers', count: 200 },
] as const;
