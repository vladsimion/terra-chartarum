import { describe, it, expect } from 'vitest';
import { GEO_LAYERS } from './geo';
import { projectCatalogue } from './atlas-catalogue';
import {
  ATLAS_EVENTS,
  activateCollectionDefaults,
  browsableLayers,
  enterCollection,
  focusLayer,
  initialAtlasState,
  setActiveLayers,
  setFacet,
  setLens,
  setRelevantToYearOnly,
  setYear,
  toggleGroup,
  toggleLayer,
  visibleLayerIds,
} from './atlas-state';

// Canonical Atlas state (ATLAS-1203 / KAN-399). Every transition is pure, so the
// reducer is testable without a map - and MapLibre visibility is derived, never
// stored, so the two cannot drift.

const ALL_IDS = GEO_LAYERS.map((l) => l.id);
const catalogue = projectCatalogue({
  availableLayerIds: ALL_IDS,
  releasedEssaySlugs: ['dacia', 'venice-sicily', 'the-league-that-left-no-map'],
});
const partial = projectCatalogue({
  availableLayerIds: ALL_IDS.filter((id) => id !== 'venetian-possessions'),
  releasedEssaySlugs: ['venice-sicily'],
});

describe('initial state', () => {
  it('starts from the layer-level defaults and nothing else', () => {
    const state = initialAtlasState(catalogue);
    expect(state.activeLayerIds).toEqual(['ne-coastline']);
    expect(state.lens).toBe('themes');
    expect(state.focusedLayerId).toBeNull();
    expect(state.activeCollectionId).toBeNull();
    expect(state.relevantToYearOnly).toBe(false);
  });

  it('declares the event names once, old contracts included', () => {
    expect(ATLAS_EVENTS.selection).toBe('atlas:selection');
    expect(ATLAS_EVENTS.time).toBe('atlas:time');
    expect(ATLAS_EVENTS.essay).toBe('atlas:essay');
    expect(new Set(Object.values(ATLAS_EVENTS)).size).toBe(Object.keys(ATLAS_EVENTS).length);
    for (const name of Object.values(ATLAS_EVENTS)) expect(name).toMatch(/^atlas:[a-z-]+$/);
  });
});

describe('layer transitions', () => {
  it('toggles a layer on and off', () => {
    const on = toggleLayer(initialAtlasState(catalogue), catalogue, 'venetian-routes');
    expect(on.activeLayerIds).toEqual(['ne-coastline', 'venetian-routes']);
    expect(toggleLayer(on, catalogue, 'venetian-routes').activeLayerIds).toEqual(['ne-coastline']);
  });

  it('refuses to activate a layer whose asset is missing', () => {
    const state = initialAtlasState(partial);
    expect(toggleLayer(state, partial, 'venetian-possessions')).toBe(state);
  });

  it('drops unavailable and duplicate IDs when restoring a set', () => {
    const state = setActiveLayers(initialAtlasState(partial), partial, [
      'venetian-routes',
      'venetian-routes',
      'venetian-possessions',
      'no-such-layer',
    ]);
    expect(state.activeLayerIds).toEqual(['venetian-routes']);
  });

  it('never mutates the state it is given', () => {
    const state = initialAtlasState(catalogue);
    const before = JSON.stringify(state);
    toggleLayer(state, catalogue, 'venetian-routes');
    focusLayer(state, 'venetian-routes');
    setYear(state, 1400);
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('MapLibre visibility is derived, never stored', () => {
  it('shows exactly the active, available layers', () => {
    const state = toggleLayer(initialAtlasState(catalogue), catalogue, 'roman-empire-117');
    expect(visibleLayerIds(state, catalogue)).toEqual(['ne-coastline', 'roman-empire-117']);
  });

  it('hides an active layer that has become unavailable', () => {
    // The same state read against a catalogue missing the asset: the layer is
    // still "active" editorially and simply cannot be drawn.
    const state = setActiveLayers(initialAtlasState(catalogue), catalogue, [
      'venetian-possessions',
    ]);
    expect(state.activeLayerIds).toEqual(['venetian-possessions']);
    expect(visibleLayerIds(state, partial)).toEqual([]);
  });

  it('applies the year filter only to whole-layer temporal layers', () => {
    let state = setActiveLayers(initialAtlasState(catalogue), catalogue, [
      'roman-empire-117',
      'venetian-routes',
    ]);
    state = setRelevantToYearOnly(setYear(state, 1350), true);
    // roman-empire-117 (106-271) drops out; venetian-routes filters per feature
    // and stays, which preserves the pre-existing perFeatureTime contract.
    expect(visibleLayerIds(state, catalogue)).toEqual(['venetian-routes']);
  });

  it('shows everything active when year relevance is off', () => {
    let state = setActiveLayers(initialAtlasState(catalogue), catalogue, ['roman-empire-117']);
    state = setYear(state, 1350);
    expect(visibleLayerIds(state, catalogue)).toEqual(['roman-empire-117']);
  });
});

describe('lens, groups and focus', () => {
  it('switches lens and expands groups independently', () => {
    let state = setLens(initialAtlasState(catalogue), 'rooms');
    expect(state.lens).toBe('rooms');
    state = toggleGroup(state, 'border');
    expect(state.expandedGroupIds).toEqual(['border']);
    expect(toggleGroup(state, 'border').expandedGroupIds).toEqual([]);
  });

  it('focuses and clears the inspected layer', () => {
    const focused = focusLayer(initialAtlasState(catalogue), 'dacia-treaty-frontiers');
    expect(focused.focusedLayerId).toBe('dacia-treaty-frontiers');
    expect(focusLayer(focused, null).focusedLayerId).toBeNull();
  });
});

describe('collections', () => {
  it('enters a collection without switching any member on', () => {
    const state = enterCollection(initialAtlasState(catalogue), 'venetian-maritime-network');
    expect(state.activeCollectionId).toBe('venetian-maritime-network');
    expect(state.lens).toBe('collections');
    expect(state.expandedGroupIds).toContain('venetian-maritime-network');
    expect(state.activeLayerIds).toEqual(['ne-coastline']);
  });

  it('activates the collection defaults as a second, deliberate act', () => {
    const state = activateCollectionDefaults(
      initialAtlasState(catalogue),
      catalogue,
      'venetian-maritime-network',
    );
    expect(state.activeLayerIds).toEqual(['ne-coastline', 'venetian-ports', 'venetian-routes']);
    expect(state.activeCollectionId).toBe('venetian-maritime-network');
  });

  it('leaves layers already on untouched and adds no duplicates', () => {
    let state = toggleLayer(initialAtlasState(catalogue), catalogue, 'venetian-ports');
    state = activateCollectionDefaults(state, catalogue, 'venetian-maritime-network');
    expect(state.activeLayerIds).toEqual(['ne-coastline', 'venetian-ports', 'venetian-routes']);
  });

  it('ignores an unknown collection', () => {
    const state = initialAtlasState(catalogue);
    expect(activateCollectionDefaults(state, catalogue, 'no-such-collection')).toBe(state);
  });

  it('leaves the collection context when asked', () => {
    const state = enterCollection(initialAtlasState(catalogue), 'hanseatic-world');
    expect(enterCollection(state, null).activeCollectionId).toBeNull();
  });
});

describe('facets', () => {
  it('sets, replaces and clears a per-layer facet', () => {
    let state = setFacet(
      initialAtlasState(catalogue),
      'dacia-treaty-frontiers',
      'line_type',
      'proposal',
    );
    expect(state.facets['dacia-treaty-frontiers']).toEqual({ line_type: 'proposal' });
    state = setFacet(state, 'dacia-treaty-frontiers', 'confidence', 'high');
    expect(Object.keys(state.facets['dacia-treaty-frontiers'])).toHaveLength(2);
    state = setFacet(state, 'dacia-treaty-frontiers', 'line_type', null);
    expect(state.facets['dacia-treaty-frontiers']).toEqual({ confidence: 'high' });
    state = setFacet(state, 'dacia-treaty-frontiers', 'confidence', null);
    expect(state.facets['dacia-treaty-frontiers']).toBeUndefined();
  });
});

describe('browsing the catalogue', () => {
  it('filters rows by the search query', () => {
    const state = { ...initialAtlasState(catalogue), query: 'muda' };
    expect(browsableLayers(state, catalogue).map((r) => r.id)).toEqual(['venetian-routes']);
  });

  it('filters rows by year relevance', () => {
    const state = setRelevantToYearOnly(setYear(initialAtlasState(catalogue), 200), true);
    const ids = browsableLayers(state, catalogue).map((r) => r.id);
    expect(ids).toContain('roman-empire-117');
    expect(ids).not.toContain('venetian-routes');
  });

  it('returns every row when nothing is filtering', () => {
    expect(browsableLayers(initialAtlasState(catalogue), catalogue)).toHaveLength(
      catalogue.layers.length,
    );
  });
});
