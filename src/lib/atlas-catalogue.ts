/**
 * Atlas catalogue projection (ATLAS-1203 / KAN-399).
 *
 * One derived model sits between the canonical registries and every Atlas
 * surface. Before this, the browser, the inspector, the time filter and the
 * MapLibre pipeline each read `GEO_LAYERS` and each decided for itself what a
 * row meant; at nineteen layers that is survivable and at two hundred it is four
 * subtly different catalogues.
 *
 * Two rules shape the module. **Availability is an input, not a lookup**: the
 * projection never touches the filesystem, so it is testable and the Astro page
 * supplies what exists. **The client gets rows, not dossiers**: provenance,
 * licence and attribution stay server-side and resolve into the inspector on
 * demand, because shipping them per row is how a browser payload grows with the
 * catalogue instead of with the screen.
 */
import { GEO_LAYERS, type GeoLayer, type GeoLayerCategory, type GeoLayerRole } from './geo';
import { GEO_COLLECTIONS, collectionExtent, type GeoCollection } from './geo-collections';
import { ROOMS } from '../data/rooms';

/** The three ways the browser can cut the same catalogue. */
export const ATLAS_LENSES = ['themes', 'collections', 'rooms'] as const;
export type AtlasLens = (typeof ATLAS_LENSES)[number];

/**
 * Runtime asset state, kept strictly separate from editorial `lifecycle`.
 *
 * `missing-asset` on a `published` layer is a release-gate failure, not another
 * greyed-out row: the scholarship says it is published and the file is not
 * there. `not-expected` is the honest state of a layer whose data has not been
 * compiled yet and whose lifecycle already says so.
 */
export type AtlasAvailability = 'available' | 'missing-asset' | 'not-expected';

/** Lifecycles whose asset must exist for the build to be releasable. */
const ASSET_REQUIRED = new Set(['published', 'in-review']);

/** Lifecycles that belong in the live browser at all. */
const BROWSABLE = new Set(['published', 'in-review']);

/** One catalogue row. This is the shape the client receives. */
export interface CatalogueLayer {
  id: string;
  title: string;
  /** The layer's own short description; the long apparatus stays server-side. */
  summary: string;
  role: GeoLayerRole;
  category?: GeoLayerCategory;
  subcategory?: string;
  room?: string;
  secondaryRooms: string[];
  collectionIds: string[];
  tags: string[];
  lifecycle: GeoLayer['lifecycle'];
  availability: AtlasAvailability;
  available: boolean;
  yearFrom: number;
  yearTo: number;
  geometry: GeoLayer['geometry'];
  format: GeoLayer['format'];
  facets: string[];
  perFeatureTime: boolean;
  /** Layer-level base default (the coastline). Collection defaults live on the collection. */
  defaultOn: boolean;
  sortWeight: number;
  /** Released essay slugs only - the staged-release gate runs before projection. */
  essaySlugs: string[];
  /** Public documentation route once KAN-412 resolves one; absent until then. */
  documentationRoute?: string;
  /** Lowercased haystack the catalogue search matches against. */
  searchText: string;
}

export interface CatalogueCollection {
  id: string;
  title: string;
  summary: string;
  description?: string;
  layerIds: string[];
  defaultLayerIds: string[];
  yearFrom: number;
  yearTo: number;
  room?: string;
  essaySlugs: string[];
  tags: string[];
  featured: boolean;
  sortWeight: number;
  /** Members that can actually be drawn right now. */
  availableLayerIds: string[];
}

export interface CatalogueGroup {
  id: string;
  title: string;
  lens: AtlasLens;
  layerIds: string[];
  sortWeight: number;
}

export interface AtlasCatalogue {
  layers: CatalogueLayer[];
  collections: CatalogueCollection[];
  groups: Record<AtlasLens, CatalogueGroup[]>;
}

export interface CatalogueInput {
  /** Layer IDs whose asset is present. Supplied by the caller; never probed here. */
  availableLayerIds: Iterable<string>;
  /** Essay slugs that have passed the staged-release gate. */
  releasedEssaySlugs: Iterable<string>;
  /** Canonical layer ID to public documentation route, once KAN-412 provides one. */
  documentationRoutes?: Record<string, string>;
  layers?: GeoLayer[];
  collections?: GeoCollection[];
}

/** Human-readable titles for the closed category vocabulary. */
const CATEGORY_TITLES: Record<GeoLayerCategory, string> = {
  'territories-boundaries': 'Territories and boundaries',
  'networks-circulation': 'Networks and circulation',
  'places-settlements': 'Places and settlements',
  'names-peoples-attestations': 'Names, peoples and attestations',
  'conflict-campaigns-frontiers': 'Conflict, campaigns and frontiers',
  'cartographic-evidence': 'Cartographic evidence',
  'historical-map-overlays': 'Historical map overlays',
};

const CATEGORY_ORDER = Object.keys(CATEGORY_TITLES) as GeoLayerCategory[];

/** Context layers are not a theme; they are the ground the themes are drawn on. */
export const CONTEXT_GROUP_ID = 'context-and-reference';

function availabilityOf(layer: GeoLayer, present: Set<string>): AtlasAvailability {
  if (present.has(layer.id)) return 'available';
  return ASSET_REQUIRED.has(layer.lifecycle) ? 'missing-asset' : 'not-expected';
}

function byOrder<T extends { sortWeight: number; id: string }>(a: T, b: T): number {
  return a.sortWeight - b.sortWeight || a.id.localeCompare(b.id);
}

/**
 * Build the catalogue. Pure: the same inputs always give the same rows, which is
 * what lets the browser, the tests and the URL restoration agree.
 */
export function projectCatalogue(input: CatalogueInput): AtlasCatalogue {
  const sourceLayers = input.layers ?? GEO_LAYERS;
  const sourceCollections = input.collections ?? GEO_COLLECTIONS;
  const present = new Set(input.availableLayerIds);
  const released = new Set(input.releasedEssaySlugs);
  const routes = input.documentationRoutes ?? {};

  const membership = new Map<string, string[]>();
  for (const collection of sourceCollections) {
    for (const layerId of collection.layerIds) {
      membership.set(layerId, [...(membership.get(layerId) ?? []), collection.id]);
    }
  }

  const layers: CatalogueLayer[] = sourceLayers
    .map((layer) => {
      const availability = availabilityOf(layer, present);
      const essaySlugs = (layer.essaySlugs ?? []).filter((slug) => released.has(slug));
      const collectionIds = membership.get(layer.id) ?? [];
      const searchText = [
        layer.title,
        layer.description,
        layer.subcategory ?? '',
        layer.category ?? '',
        ...layer.tags,
      ]
        .join(' ')
        .toLowerCase();
      const row: CatalogueLayer = {
        id: layer.id,
        title: layer.title,
        summary: layer.description,
        role: layer.role,
        category: layer.category,
        subcategory: layer.subcategory,
        room: layer.room,
        secondaryRooms: layer.secondaryRooms,
        collectionIds,
        tags: layer.tags,
        lifecycle: layer.lifecycle,
        availability,
        available: availability === 'available',
        yearFrom: layer.yearFrom,
        yearTo: layer.yearTo,
        geometry: layer.geometry,
        format: layer.format,
        facets: layer.facets,
        perFeatureTime: layer.perFeatureTime,
        defaultOn: layer.defaultOn && availability === 'available',
        sortWeight: layer.sortWeight,
        essaySlugs,
        searchText,
      };
      if (routes[layer.id]) row.documentationRoute = routes[layer.id];
      return row;
    })
    // `in-preparation` and `planned` are editorial promises, not rows a reader
    // can act on. They stay out of the live browser entirely.
    .filter((row) => BROWSABLE.has(row.lifecycle))
    .sort(byOrder);

  const browsable = new Set(layers.map((row) => row.id));

  const collections: CatalogueCollection[] = sourceCollections
    .map((collection) => {
      const extent = collectionExtent(collection);
      const layerIds = collection.layerIds.filter((id) => browsable.has(id));
      return {
        id: collection.id,
        title: collection.title,
        summary: collection.summary,
        description: collection.description,
        layerIds,
        defaultLayerIds: collection.defaultLayerIds.filter((id) => browsable.has(id)),
        yearFrom: extent.from,
        yearTo: extent.to,
        room: collection.room,
        essaySlugs: collection.essaySlugs.filter((slug) => released.has(slug)),
        tags: collection.tags,
        featured: collection.featured,
        sortWeight: collection.sortWeight,
        availableLayerIds: layerIds.filter((id) =>
          layers.some((row) => row.id === id && row.available),
        ),
      };
    })
    // A collection whose members cannot be drawn is a dead end. This is the rule
    // that keeps a Crusades collection from shipping before its layers do.
    .filter((collection) => collection.availableLayerIds.length > 0)
    .sort(byOrder);

  return { layers, collections, groups: buildGroups(layers, collections) };
}

function buildGroups(
  layers: CatalogueLayer[],
  collections: CatalogueCollection[],
): Record<AtlasLens, CatalogueGroup[]> {
  const themes: CatalogueGroup[] = CATEGORY_ORDER.map((category, index) => ({
    id: category,
    title: CATEGORY_TITLES[category],
    lens: 'themes' as const,
    layerIds: layers.filter((row) => row.category === category).map((row) => row.id),
    sortWeight: index,
  })).filter((group) => group.layerIds.length > 0);

  const context = layers.filter((row) => row.role === 'context').map((row) => row.id);
  if (context.length > 0) {
    themes.push({
      id: CONTEXT_GROUP_ID,
      title: 'Context and reference',
      lens: 'themes',
      layerIds: context,
      // Always last: the frame comes after the argument.
      sortWeight: CATEGORY_ORDER.length,
    });
  }

  const rooms: CatalogueGroup[] = ROOMS.map((room) => ({
    id: room.slug,
    title: room.title,
    lens: 'rooms' as const,
    layerIds: layers
      .filter((row) => row.room === room.slug || row.secondaryRooms.includes(room.slug))
      .map((row) => row.id),
    sortWeight: room.order,
  })).filter((group) => group.layerIds.length > 0);

  const collectionGroups: CatalogueGroup[] = collections.map((collection) => ({
    id: collection.id,
    title: collection.title,
    lens: 'collections' as const,
    layerIds: collection.layerIds,
    sortWeight: collection.sortWeight,
  }));

  return {
    themes: themes.sort(byOrder),
    collections: collectionGroups,
    rooms: rooms.sort(byOrder),
  };
}

/**
 * Release-gate check: a layer whose scholarship is published or under review
 * must have its asset. Returns the offenders so a build can fail loudly rather
 * than shipping a toggle that does nothing.
 */
export function auditCatalogueAvailability(catalogue: AtlasCatalogue): string[] {
  return catalogue.layers
    .filter((row) => row.availability === 'missing-asset')
    .map((row) => `Layer "${row.id}" is ${row.lifecycle} but its asset is missing`);
}

/** Server-side only: the apparatus deliberately kept out of the client rows. */
export interface LayerDossier {
  id: string;
  source: string;
  license: string;
  attribution: string;
  crs: string;
  documentationLinks: { label: string; href: string }[];
  essayLinks: { slug: string; sectionId: string; label: string }[];
}

export function layerDossier(layerId: string, layers: GeoLayer[] = GEO_LAYERS): LayerDossier {
  const layer = layers.find((entry) => entry.id === layerId);
  if (!layer) throw new Error(`Unknown layer "${layerId}"`);
  return {
    id: layer.id,
    source: layer.source,
    license: layer.license,
    attribution: layer.attribution,
    crs: layer.crs,
    documentationLinks: layer.documentationLinks,
    essayLinks: layer.essayLinks,
  };
}

/** Layers whose temporal envelope contains the selected year. */
export function relevantToYear(layers: CatalogueLayer[], year: number): CatalogueLayer[] {
  return layers.filter((row) => row.yearFrom <= year && year <= row.yearTo);
}
