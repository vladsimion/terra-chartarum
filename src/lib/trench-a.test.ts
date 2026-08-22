import { describe, expect, it } from 'vitest';
import { getToponyms } from './toponyms';
import {
  CND_ATLAS_LAYER,
  atlasUrl,
  getTrenchALocal,
  getTrenchAPits,
  getTrenchAPlaces,
  getTrenchAStelae,
} from './trench-a';

describe('Trench A bridge into the corpus', () => {
  it('carries every migrated stela and test pit', () => {
    // Twelve of the thirteen stelae migrated; the Present Survey is rhetorical
    // and stays local, which the bridge records rather than omits.
    expect(getTrenchAStelae()).toHaveLength(12);
    expect(getTrenchAPits()).toHaveLength(4);
    expect(getTrenchALocal().length).toBeGreaterThan(0);
    expect(getTrenchALocal().every((entry) => entry.reason.length > 0)).toBe(true);
  });

  it('counts silences as records, not as gaps', () => {
    for (const pit of getTrenchAPits()) {
      expect(pit.attestations).toBeGreaterThan(0);
      expect(pit.silences).toBeGreaterThan(0);
      expect(pit.silences).toBeLessThanOrEqual(pit.attestations);
      // Every cell is either migrated or declared local (KAN-338).
      expect(pit.cells).toBeGreaterThan(0);
      expect(pit.localCells).toBeGreaterThanOrEqual(0);
    }
  });

  it('opens the Atlas on the research tier, which says its records are unreviewed', () => {
    const url = atlasUrl('att-0001');
    expect(url.startsWith('/atlas?')).toBe(true);
    expect(url).toContain(`layers=${CND_ATLAS_LAYER}`);
    expect(url).toContain('feature=att-0001');
    expect(CND_ATLAS_LAYER).toContain('research');
  });

  it('keeps the toponym concordance and the corpus on the same referents', () => {
    // The bug this guards is the one KAN-339 retired: two places forty
    // kilometres apart sharing one concordance entry, and so one pin.
    const places = getTrenchAPlaces();
    const linked = getToponyms().filter((toponym) => toponym.cndPlaceId);
    expect(linked.length).toBeGreaterThan(0);

    for (const toponym of linked) {
      const place = places.get(toponym.cndPlaceId!);
      if (!place) continue;
      expect(place.locationStatus).toBe('located');
      const [lng, lat] = toponym.coords;
      expect(Math.abs(lng - place.lon!)).toBeLessThan(0.05);
      expect(Math.abs(lat - place.lat!)).toBeLessThan(0.05);
    }
  });

  it('gives each corpus place at most one concordance entry', () => {
    const ids = getToponyms()
      .map((toponym) => toponym.cndPlaceId)
      .filter((id): id is string => Boolean(id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
