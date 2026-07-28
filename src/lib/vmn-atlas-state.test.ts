import { describe, expect, it } from 'vitest';
import { getPortProfile } from './vmn';
import { getVmnAtlasLink, getVmnAtlasLinks } from './vmn-atlas-links';
import { parseVmnAtlasState, toVmnAtlasHref } from './vmn-atlas-state';

describe('VMN Atlas URL state (KAN-190 / KAN-191)', () => {
  it('round-trips the layer, year and target state', () => {
    const href = toVmnAtlasHref({
      year: 1450,
      zoom: 4,
      layers: ['venetian-ports', 'venetian-routes'],
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
      port: undefined,
      route: undefined,
      territory: undefined,
    });
  });

  it('publishes one ID-only mapping for every Venice-side port beat', async () => {
    const links = getVmnAtlasLinks();
    const portLinks = links.filter((link) => link.targetType === 'port');
    expect(portLinks).toHaveLength(12);
    for (const link of portLinks) {
      expect(await getPortProfile(link.targetId), link.beatId).not.toBeNull();
      expect(link.href).toContain(`port=${link.targetId}`);
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
