import { describe, it, expect } from 'vitest';
import { GEO_LAYERS } from './geo';
import {
  ATLAS_LENSES,
  CONTEXT_GROUP_ID,
  auditCatalogueAvailability,
  layerDossier,
  projectCatalogue,
  relevantToYear,
} from './atlas-catalogue';

// The catalogue projection (ATLAS-1203 / KAN-399): one derived model between the
// registries and every Atlas surface.

const ALL_IDS = GEO_LAYERS.map((l) => l.id);
const ESSAYS = ['dacia', 'venice-sicily', 'the-league-that-left-no-map'];

function build(overrides: Partial<Parameters<typeof projectCatalogue>[0]> = {}) {
  return projectCatalogue({
    availableLayerIds: ALL_IDS,
    releasedEssaySlugs: ESSAYS,
    ...overrides,
  });
}

describe('projection resolves the registries into one model', () => {
  it('carries taxonomy, rooms, membership and facets onto every row', () => {
    const catalogue = build();
    const treaty = catalogue.layers.find((row) => row.id === 'dacia-treaty-frontiers')!;
    expect(treaty.role).toBe('historical');
    expect(treaty.category).toBe('conflict-campaigns-frontiers');
    expect(treaty.room).toBe('border');
    expect(treaty.secondaryRooms).toEqual(['map']);
    expect(treaty.collectionIds).toEqual(['corpus-chartarum-daciae']);
    expect(treaty.facets).toContain('line_type');
    expect(treaty.perFeatureTime).toBe(true);
  });

  it('sorts deterministically by weight then id', () => {
    const catalogue = build();
    const weights = catalogue.layers.map((row) => row.sortWeight);
    expect(weights).toEqual([...weights].sort((a, b) => a - b));
    expect(build().layers.map((r) => r.id)).toEqual(catalogue.layers.map((r) => r.id));
  });

  it('records the many-to-many membership on the shared Roman layers', () => {
    const roman = build().layers.find((row) => row.id === 'dacia-roman-sites')!;
    expect(roman.collectionIds).toEqual(['corpus-chartarum-daciae', 'roman-geography']);
  });
});

describe('the client payload stays a row, not a dossier', () => {
  it('ships no provenance, licence or attribution per row', () => {
    for (const row of build().layers) {
      expect(Object.keys(row), row.id).not.toContain('source');
      expect(Object.keys(row), row.id).not.toContain('license');
      expect(Object.keys(row), row.id).not.toContain('attribution');
      expect(Object.keys(row), row.id).not.toContain('documentationLinks');
    }
  });

  it('resolves the apparatus server-side when the inspector asks for it', () => {
    const dossier = layerDossier('venetian-ports');
    expect(dossier.license).toBe('CC BY');
    expect(dossier.documentationLinks).toHaveLength(3);
    expect(() => layerDossier('no-such-layer')).toThrow(/Unknown layer/);
  });

  it('builds a search haystack from title, description and tags', () => {
    const row = build().layers.find((r) => r.id === 'hanseatic-routes')!;
    expect(row.searchText).toContain('hansa');
    expect(row.searchText).toBe(row.searchText.toLowerCase());
  });
});

describe('availability and lifecycle are separate inputs', () => {
  it('marks a published layer with no asset as a release-gate failure', () => {
    const catalogue = build({
      availableLayerIds: ALL_IDS.filter((id) => id !== 'venetian-ports'),
    });
    const row = catalogue.layers.find((r) => r.id === 'venetian-ports')!;
    expect(row.availability).toBe('missing-asset');
    expect(row.available).toBe(false);
    expect(auditCatalogueAvailability(catalogue)).toEqual([
      'Layer "venetian-ports" is published but its asset is missing',
    ]);
  });

  it('passes the audit when every published asset is present', () => {
    expect(auditCatalogueAvailability(build())).toEqual([]);
  });

  it('does not expect an asset from a planned layer, and keeps it out of the browser', () => {
    const planned = { ...GEO_LAYERS[0], id: 'future-layer', lifecycle: 'planned' as const };
    const catalogue = projectCatalogue({
      availableLayerIds: ALL_IDS,
      releasedEssaySlugs: ESSAYS,
      layers: [...GEO_LAYERS, planned],
    });
    expect(catalogue.layers.some((row) => row.id === 'future-layer')).toBe(false);
    expect(auditCatalogueAvailability(catalogue)).toEqual([]);
  });

  it('keeps an in-review layer browsable and still expects its asset', () => {
    const row = build().layers.find((r) => r.id === 'dacia-attestations-research')!;
    expect(row.lifecycle).toBe('in-review');
    expect(row.availability).toBe('available');
  });

  it('never marks an unavailable layer default-on', () => {
    const catalogue = build({ availableLayerIds: [] });
    expect(catalogue.layers.every((row) => row.defaultOn === false)).toBe(true);
  });
});

describe('staged essay release runs before projection', () => {
  it('drops essay slugs that have not been released', () => {
    const catalogue = build({ releasedEssaySlugs: ['dacia'] });
    const ports = catalogue.layers.find((r) => r.id === 'venetian-ports')!;
    expect(ports.essaySlugs).toEqual([]);
    expect(catalogue.layers.find((r) => r.id === 'dacia-attestations')!.essaySlugs).toEqual([
      'dacia',
    ]);
  });

  it('filters held essays out of collection payloads too', () => {
    const catalogue = build({ releasedEssaySlugs: [] });
    for (const collection of catalogue.collections) {
      expect(collection.essaySlugs, collection.id).toEqual([]);
    }
  });
});

describe('grouping supports all three lenses', () => {
  it('offers exactly the declared lenses', () => {
    const catalogue = build();
    expect(Object.keys(catalogue.groups).sort()).toEqual([...ATLAS_LENSES].sort());
  });

  it('groups themes by canonical category and files context last', () => {
    const themes = build().groups.themes;
    expect(themes.at(-1)!.id).toBe(CONTEXT_GROUP_ID);
    expect(themes.at(-1)!.layerIds).toEqual([
      'ne-coastline',
      'ne-land',
      'ne-rivers',
      'ne-boundaries',
    ]);
    const frontiers = themes.find((g) => g.id === 'conflict-campaigns-frontiers')!;
    expect(frontiers.layerIds).toEqual(['dacia-treaty-frontiers']);
  });

  it('places a layer in every room that claims it, primary or secondary', () => {
    const rooms = build().groups.rooms;
    const road = rooms.find((g) => g.id === 'road')!;
    expect(road.layerIds).toContain('venetian-routes');
    expect(road.layerIds).toContain('ne-rivers'); // secondary room
  });

  it('emits no empty group in any lens', () => {
    const catalogue = build();
    for (const lens of ATLAS_LENSES) {
      for (const group of catalogue.groups[lens]) {
        expect(group.layerIds.length, `${lens}/${group.id}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('a collection with nothing drawable does not ship', () => {
  it('drops a collection whose members are all unavailable', () => {
    const catalogue = build({
      availableLayerIds: ALL_IDS.filter((id) => !id.startsWith('venetian-')),
    });
    expect(catalogue.collections.some((c) => c.id === 'venetian-maritime-network')).toBe(false);
    expect(catalogue.groups.collections.some((g) => g.id === 'venetian-maritime-network')).toBe(
      false,
    );
  });

  it('keeps a partially available collection and reports what is drawable', () => {
    const catalogue = build({
      availableLayerIds: ALL_IDS.filter((id) => id !== 'venetian-possessions'),
    });
    const vmn = catalogue.collections.find((c) => c.id === 'venetian-maritime-network')!;
    expect(vmn.layerIds).toHaveLength(3);
    expect(vmn.availableLayerIds).toEqual(['venetian-ports', 'venetian-routes']);
  });

  it('derives the collection extent from its members', () => {
    const vmn = build().collections.find((c) => c.id === 'venetian-maritime-network')!;
    expect([vmn.yearFrom, vmn.yearTo]).toEqual([1200, 1500]);
  });
});

describe('temporal relevance', () => {
  it('selects only layers whose envelope contains the year', () => {
    const ids = relevantToYear(build().layers, 1350).map((r) => r.id);
    expect(ids).toContain('venetian-ports');
    expect(ids).not.toContain('roman-empire-117');
  });
});
