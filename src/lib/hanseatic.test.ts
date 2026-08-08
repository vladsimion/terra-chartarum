import { describe, expect, it } from 'vitest';
import { parseAtlasShareState } from './atlas-share';
import {
  getHanseaticKontor,
  getHanseaticPlacePhase,
  hanseaticPlaceNames,
  isPending,
  listHanseaticCommodities,
  listHanseaticEvents,
  listHanseaticKontore,
  listHanseaticRoutes,
  searchHanseaticPlaces,
  toHanseaticAtlasHref,
} from './hanseatic';

describe('Hanseatic publication data', () => {
  it('resolves the Lübeck phase from generated data', () => {
    const phase = getHanseaticPlacePhase('lubeck');
    expect(phase.id).toBe('hse-place-lubeck-leading-1356');
    expect(phase.coordinates).toEqual([10.6866, 53.8655]);
    expect(phase.source).toBe('hse-src-marczinek-data-2025');
  });

  it('builds the frozen layer/year/feature Atlas contract', () => {
    const href = toHanseaticAtlasHref(getHanseaticPlacePhase('lubeck'));
    const parsed = parseAtlasShareState(new URL(href, 'https://example.test').search);
    expect(parsed.year).toBe(1356);
    expect(parsed.layers).toEqual(['hanseatic-places']);
    expect(parsed.feature).toBe('hse-place-lubeck-leading-1356');
  });
});

describe('Hanseatic place-name search (KAN-311)', () => {
  it('finds a place by its historic name', () => {
    expect(searchHanseaticPlaces('Wisby').map((p) => p.place_id)).toEqual(['visby']);
    expect(searchHanseaticPlaces('Lubeca').map((p) => p.place_id)).toEqual(['lubeck']);
  });

  it('finds a place by its modern name', () => {
    expect(searchHanseaticPlaces('Visby').map((p) => p.place_id)).toEqual(['visby']);
  });

  it('ignores diacritics, so a plain keyboard reaches Lübeck', () => {
    expect(searchHanseaticPlaces('lubeck').map((p) => p.place_id)).toEqual(['lubeck']);
    expect(searchHanseaticPlaces('LÜBECK').map((p) => p.place_id)).toEqual(['lubeck']);
  });

  it('matches on a partial name', () => {
    expect(searchHanseaticPlaces('vis').map((p) => p.place_id)).toEqual(['visby']);
  });

  it('returns nothing for an empty or unmatched query', () => {
    expect(searchHanseaticPlaces('')).toEqual([]);
    expect(searchHanseaticPlaces('   ')).toEqual([]);
    expect(searchHanseaticPlaces('Novgorod').map((p) => p.place_id)).toEqual(['novgorod']);
  });

  it('lists each distinct name once', () => {
    expect(hanseaticPlaceNames(getHanseaticPlacePhase('visby'))).toEqual(['Visby', 'Wisby']);
  });
});

describe('Hanseatic Kontor dossiers', () => {
  it('carries all four Kontore named by KAN-305', () => {
    const ids = listHanseaticKontore().map((kontor) => kontor.kontor_id);
    expect(ids).toEqual(['novgorod', 'bergen', 'london', 'bruges']);
  });

  it('classes a Kontor as a merchant compound rather than a colony', () => {
    for (const kontor of listHanseaticKontore()) {
      expect(kontor.legal_status).toBe('merchant_compound');
    }
  });

  it('publishes complete reviewed dossiers joined to the KAN-306 gazetteer', () => {
    const bergen = getHanseaticKontor('bergen');
    expect(bergen.review_status).toBe('reviewed');
    expect(isPending(bergen.profile_summary)).toBe(false);
    expect(isPending(bergen.primary_witness)).toBe(false);
    expect(isPending(bergen.place_id)).toBe(false);
    expect(bergen.place_id).toBe('bergen');
    expect(bergen.profile_summary.split(/\n\s*\n/)).toHaveLength(3);
  });

  it('rejects an unknown Kontor', () => {
    expect(() => getHanseaticKontor('novgorod-2')).toThrow(/Unknown Hanseatic Kontor/);
  });
});

describe('Hanseatic routes, commodities and events (KAN-308)', () => {
  it('ships the scoped production counts', () => {
    expect(listHanseaticRoutes()).toHaveLength(7);
    expect(listHanseaticCommodities()).toHaveLength(10);
    expect(listHanseaticEvents()).toHaveLength(16);
  });

  it('carries normalized commodity joins for each route', () => {
    for (const route of listHanseaticRoutes()) {
      expect(route.commodity_joins.length).toBeGreaterThan(0);
      expect(new Set(route.commodity_joins.map((join) => join.commodity_id))).toEqual(
        new Set(route.commodities.split('|')),
      );
    }
  });

  it('includes the four required core corridors', () => {
    const ids = listHanseaticRoutes().map((route) => route.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'hse-route-lubeck-visby-novgorod',
        'hse-route-lubeck-bergen',
        'hse-route-hamburg-london',
        'hse-route-baltic-bruges',
      ]),
    );
  });

  it('represents sanctions, treaties, Diets and institutional afterlives', () => {
    const types = new Set(listHanseaticEvents().map((event) => event.event_type));
    expect([...types]).toEqual(
      expect.arrayContaining(['embargo', 'peace_treaty', 'hansetag', 'institutional_afterlife']),
    );
  });
});
