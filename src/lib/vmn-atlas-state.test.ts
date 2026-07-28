import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { geojson } from 'flatgeobuf';
import { describe, expect, it } from 'vitest';
import { getPortProfile } from './vmn';
import { getVmnAtlasLink, getVmnAtlasLinks } from './vmn-atlas-links';
import { parseVmnAtlasState, resolveVmnBeatState, toVmnAtlasHref } from './vmn-atlas-state';

async function readFgb(name: string): Promise<GeoJSON.Feature[]> {
  const bytes = new Uint8Array(await readFile(join(process.cwd(), 'public', 'geo', name)));
  const features: GeoJSON.Feature[] = [];
  for await (const feature of geojson.deserialize(bytes)) {
    features.push(feature as GeoJSON.Feature);
  }
  return features;
}

describe('VMN Atlas URL state (KAN-188–KAN-192)', () => {
  it('round-trips the layer, year and target state', () => {
    const href = toVmnAtlasHref({
      year: 1450,
      zoom: 4,
      layers: ['venetian-ports', 'venetian-routes'],
      beat: undefined,
      port: 'modon',
    });
    expect(parseVmnAtlasState(href.split('?')[1])).toEqual({
      year: 1450,
      zoom: 4,
      layers: ['venetian-ports', 'venetian-routes'],
      port: 'modon',
      route: undefined,
      territory: undefined,
    });
  });

  it('accepts the legacy date alias and discards unknown layers', () => {
    expect(parseVmnAtlasState('?date=1500&layers=venetian-possessions,unknown')).toEqual({
      year: 1500,
      zoom: undefined,
      layers: ['venetian-possessions'],
      beat: undefined,
      port: undefined,
      route: undefined,
      territory: undefined,
    });
  });

  it('resolves beat aliases while preserving explicit URL overrides', () => {
    const beats = getVmnAtlasLinks();
    expect(resolveVmnBeatState(parseVmnAtlasState('?beat=port_modon'), beats)).toMatchObject({
      beat: 'port_modon',
      year: 1450,
      layers: ['venetian-ports', 'venetian-routes'],
      port: 'modon',
    });
    expect(
      resolveVmnBeatState(
        parseVmnAtlasState('?beat=port_modon&year=1470&route=muda_romania'),
        beats,
      ),
    ).toMatchObject({
      year: 1470,
      route: 'muda_romania',
      port: undefined,
    });
    expect(resolveVmnBeatState(parseVmnAtlasState('?beat=unknown'), beats)).toEqual({
      year: undefined,
      zoom: undefined,
      layers: undefined,
      beat: 'unknown',
      port: undefined,
      route: undefined,
      territory: undefined,
    });
  });

  it('validates every ID-only mapping against its compiled Atlas object and state', async () => {
    const links = getVmnAtlasLinks();
    const [routes, possessions] = await Promise.all([
      readFgb('venetian-routes.fgb'),
      readFgb('venetian-possessions.fgb'),
    ]);
    const routeIds = new Set(routes.map((feature) => feature.properties?.route_id));
    const territoryIds = new Set(possessions.map((feature) => feature.properties?.territory));

    expect(links.filter((link) => link.targetType === 'port')).toHaveLength(12);
    for (const link of links) {
      if (link.targetType === 'port') {
        expect(await getPortProfile(link.targetId), link.beatId).not.toBeNull();
      }
      if (link.targetType === 'route') expect(routeIds.has(link.targetId), link.beatId).toBe(true);
      if (link.targetType === 'possession') {
        expect(territoryIds.has(link.targetId), link.beatId).toBe(true);
      }

      const state = parseVmnAtlasState(link.href.split('?')[1]);
      expect(state.year, link.beatId).toBe(link.year);
      expect(state.layers, link.beatId).toEqual(link.layerIds);
      const target =
        link.targetType === 'port'
          ? state.port
          : link.targetType === 'route'
            ? state.route
            : state.territory;
      expect(target, link.beatId).toBe(link.targetId);
    }
  });

  it('maps the route spine and contraction beat to highlighted Atlas states', () => {
    expect(getVmnAtlasLink('rotta_spine')).toMatchObject({
      targetType: 'route',
      targetId: 'muda_romania',
      year: 1450,
      displayMode: 'highlight',
    });
    expect(getVmnAtlasLink('contraction_1500')).toMatchObject({
      targetType: 'possession',
      targetId: 'morea',
      year: 1500,
      displayMode: 'highlight',
    });
  });
});
