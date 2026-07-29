import { describe, expect, it } from 'vitest';
import { getPortIds, getPortProfile, OPEN_ENDED } from './vmn';

describe('VMN port resolver (PortProfilePopover data)', () => {
  it('resolves every gazetteer port and no phantom ids', async () => {
    const ids = await getPortIds();
    // Mirrors the compiled dataset lock: 70 stable ports across 86 phases.
    expect(ids).toHaveLength(70);
    expect(ids).toContain('zara');
    expect(ids).toContain('venice');
  });

  it('groups multi-phase ports into a chronological timeline with a name triple', async () => {
    const zara = await getPortProfile('zara');
    expect(zara).not.toBeNull();
    expect(zara!.nameHistoric).toBe('Zara');
    expect(zara!.nameModern).toBe('Zadar');
    expect(zara!.nameLocal).toBe('Zadar');
    // Three documented phases, sorted ascending by valid_from.
    expect(zara!.phases.map((phase) => phase.validFrom)).toEqual([1202, 1358, 1409]);
    expect(zara!.phases.map((phase) => phase.status)).toEqual([
      'subject',
      'foreign_port',
      'subject',
    ]);
    // Representative note comes from a phase that carries prose.
    expect(zara!.note).toMatch(/Fourth Crusade/);
  });

  it('projects the open-ended sentinel and builds a deep link', async () => {
    const venice = await getPortProfile('venice');
    expect(venice!.phases.some((phase) => phase.validTo === OPEN_ENDED)).toBe(true);
    expect(venice!.yearTo).toBe(OPEN_ENDED);
    expect(venice!.atlasHref).toBe('/atlas?port=venice');
  });

  it('derives route membership from the published waypoints', async () => {
    const modon = await getPortProfile('modon');
    const routeIds = modon!.routes.map((route) => route.routeId).sort();
    // Modon is a hinge of the muda system - it appears on multiple convoy spines.
    expect(routeIds).toContain('muda_alexandria');
    expect(routeIds).toContain('muda_syria');
    expect(modon!.routes.every((route) => route.name.length > 0)).toBe(true);
  });

  it('returns null for an unknown port so the popover can show the notice', async () => {
    expect(await getPortProfile('atlantis')).toBeNull();
  });
});
