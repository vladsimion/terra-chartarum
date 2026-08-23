/**
 * Canonical Atlas state (ATLAS-1203 / KAN-399).
 *
 * One state object, and MapLibre visibility is *derived* from it. That is the
 * whole point: previously "which layers are on" existed in the checkbox DOM, in
 * the MapLibre style and in the share URL, and any two of them could drift. Here
 * the state is the single answer and `visibleLayerIds` is the only way to ask.
 *
 * Every transition is a pure function returning a new state, so the reducer can
 * be tested without a map, a browser or a DOM - and so URL restoration is just
 * another transition rather than a second code path.
 */
import type { AtlasCatalogue, AtlasLens, CatalogueLayer } from './atlas-catalogue';

export interface AtlasState {
  /** Layers the reader has turned on, in activation order. */
  activeLayerIds: string[];
  /** The layer the inspector is showing, if any. */
  focusedLayerId: string | null;
  lens: AtlasLens;
  /** Groups/collections the reader has opened; persisted so a lens keeps its shape. */
  expandedGroupIds: string[];
  year: number;
  /** Hide layers whose envelope does not contain `year`. */
  relevantToYearOnly: boolean;
  /** The collection being read, if the reader arrived through one. */
  activeCollectionId: string | null;
  /** Per-layer facet selections: layerId -> field -> value. */
  facets: Record<string, Record<string, string>>;
  /** Pre-existing corpus/essay selection state, carried unchanged. */
  essaySlug: string | null;
  query: string;
}

/**
 * Event names the Atlas island dispatches. Declared here so a listener and a
 * dispatcher cannot disagree about a string, and so the existing `atlas:*`
 * contracts stay visible next to the additions.
 */
export const ATLAS_EVENTS = {
  /** Pre-existing contracts (KAN-172 / KAN-189 / KAN-214). Unchanged. */
  selection: 'atlas:selection',
  time: 'atlas:time',
  essay: 'atlas:essay',
  /** KAN-399 additions, scoped as narrowly as the surfaces that need them. */
  layerToggle: 'atlas:layer-toggle',
  layersChanged: 'atlas:layers-changed',
  layerFocus: 'atlas:layer-focus',
  lensChanged: 'atlas:lens-changed',
  collectionActivate: 'atlas:collection-activate',
} as const;

export type AtlasEventName = (typeof ATLAS_EVENTS)[keyof typeof ATLAS_EVENTS];

export const DEFAULT_YEAR = 1500;

export function initialAtlasState(catalogue: AtlasCatalogue, year = DEFAULT_YEAR): AtlasState {
  return {
    activeLayerIds: catalogue.layers.filter((row) => row.defaultOn).map((row) => row.id),
    focusedLayerId: null,
    lens: 'themes',
    expandedGroupIds: [],
    year,
    relevantToYearOnly: false,
    activeCollectionId: null,
    facets: {},
    essaySlug: null,
    query: '',
  };
}

/** Only an available layer can be switched on. A pending toggle is a no-op. */
function canActivate(catalogue: AtlasCatalogue, layerId: string): boolean {
  return catalogue.layers.some((row) => row.id === layerId && row.available);
}

export function toggleLayer(
  state: AtlasState,
  catalogue: AtlasCatalogue,
  layerId: string,
): AtlasState {
  if (state.activeLayerIds.includes(layerId)) {
    return { ...state, activeLayerIds: state.activeLayerIds.filter((id) => id !== layerId) };
  }
  if (!canActivate(catalogue, layerId)) return state;
  return { ...state, activeLayerIds: [...state.activeLayerIds, layerId] };
}

export function setActiveLayers(
  state: AtlasState,
  catalogue: AtlasCatalogue,
  layerIds: string[],
): AtlasState {
  const seen = new Set<string>();
  const next = layerIds.filter((id) => {
    if (seen.has(id) || !canActivate(catalogue, id)) return false;
    seen.add(id);
    return true;
  });
  return { ...state, activeLayerIds: next };
}

export function focusLayer(state: AtlasState, layerId: string | null): AtlasState {
  return { ...state, focusedLayerId: layerId };
}

export function setLens(state: AtlasState, lens: AtlasLens): AtlasState {
  return { ...state, lens };
}

export function toggleGroup(state: AtlasState, groupId: string): AtlasState {
  const expanded = state.expandedGroupIds.includes(groupId)
    ? state.expandedGroupIds.filter((id) => id !== groupId)
    : [...state.expandedGroupIds, groupId];
  return { ...state, expandedGroupIds: expanded };
}

export function setYear(state: AtlasState, year: number): AtlasState {
  return { ...state, year };
}

export function setRelevantToYearOnly(state: AtlasState, relevantToYearOnly: boolean): AtlasState {
  return { ...state, relevantToYearOnly };
}

/**
 * Enter a collection's context without switching anything on. This is what a
 * collection deep link does: the reader arrives at the argument, and choosing to
 * draw it is a second, deliberate act.
 */
export function enterCollection(state: AtlasState, collectionId: string | null): AtlasState {
  if (collectionId === null) return { ...state, activeCollectionId: null };
  return {
    ...state,
    activeCollectionId: collectionId,
    lens: 'collections',
    expandedGroupIds: state.expandedGroupIds.includes(collectionId)
      ? state.expandedGroupIds
      : [...state.expandedGroupIds, collectionId],
  };
}

/** Draw a collection's default composition, leaving anything already on in place. */
export function activateCollectionDefaults(
  state: AtlasState,
  catalogue: AtlasCatalogue,
  collectionId: string,
): AtlasState {
  const collection = catalogue.collections.find((entry) => entry.id === collectionId);
  if (!collection) return state;
  const additions = collection.defaultLayerIds.filter(
    (id) => !state.activeLayerIds.includes(id) && canActivate(catalogue, id),
  );
  return {
    ...enterCollection(state, collectionId),
    activeLayerIds: [...state.activeLayerIds, ...additions],
  };
}

export function setFacet(
  state: AtlasState,
  layerId: string,
  field: string,
  value: string | null,
): AtlasState {
  const current = { ...(state.facets[layerId] ?? {}) };
  if (value === null || value === '') delete current[field];
  else current[field] = value;
  const facets = { ...state.facets };
  if (Object.keys(current).length === 0) delete facets[layerId];
  else facets[layerId] = current;
  return { ...state, facets };
}

/**
 * The single source of truth for what MapLibre draws.
 *
 * A layer is visible when it is active, its asset is present, and - if the
 * reader asked for year relevance - its envelope contains the selected year.
 * Per-feature temporal layers stay visible and filter their own features, which
 * is the pre-existing `perFeatureTime` contract and is preserved here.
 */
export function visibleLayerIds(state: AtlasState, catalogue: AtlasCatalogue): string[] {
  const rows = new Map(catalogue.layers.map((row) => [row.id, row]));
  return state.activeLayerIds.filter((id) => {
    const row = rows.get(id);
    if (!row || !row.available) return false;
    if (!state.relevantToYearOnly) return true;
    if (row.perFeatureTime) return true;
    return row.yearFrom <= state.year && state.year <= row.yearTo;
  });
}

/** Rows the browser should list, after the year filter and the search query. */
export function browsableLayers(state: AtlasState, catalogue: AtlasCatalogue): CatalogueLayer[] {
  const query = state.query.trim().toLowerCase();
  return catalogue.layers.filter((row) => {
    if (state.relevantToYearOnly && !(row.yearFrom <= state.year && state.year <= row.yearTo)) {
      return false;
    }
    return query === '' || row.searchText.includes(query);
  });
}
