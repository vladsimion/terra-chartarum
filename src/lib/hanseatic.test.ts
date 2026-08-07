import { describe, expect, it } from 'vitest';
import { parseAtlasShareState } from './atlas-share';
import {
  getHanseaticKontor,
  getHanseaticPlacePhase,
  hanseaticPlaceNames,
  isPending,
  listHanseaticKontore,
  searchHanseaticPlaces,
  toHanseaticAtlasHref,
} from './hanseatic';

describe('Hanseatic vertical slice', () => {
  it('resolves the Lübeck phase from generated data', () => {
    const phase = getHanseaticPlacePhase('lubeck');
    expect(phase.id).toBe('hse-place-lubeck-leading-1358');
    expect(phase.coordinates).toEqual([10.6866, 53.8655]);
    expect(phase.source).toBe('hse-src-spec');
  });

  it('builds the frozen layer/year/feature Atlas contract', () => {
    const href = toHanseaticAtlasHref(getHanseaticPlacePhase('lubeck'));
    const parsed = parseAtlasShareState(new URL(href, 'https://example.test').search);
    expect(parsed.year).toBe(1358);
    expect(parsed.layers).toEqual(['hanseatic-places']);
    expect(parsed.feature).toBe('hse-place-lubeck-leading-1358');
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
    expect(searchHanseaticPlaces('Novgorod')).toEqual([]);
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

  it('marks unresearched fields as pending so the profile can withhold them', () => {
    const bergen = getHanseaticKontor('bergen');
    expect(bergen.review_status).toBe('provisional');
    expect(isPending(bergen.profile_summary)).toBe(true);
    expect(isPending(bergen.primary_witness)).toBe(false);
  });

  it('rejects an unknown Kontor', () => {
    expect(() => getHanseaticKontor('novgorod-2')).toThrow(/Unknown Hanseatic Kontor/);
  });
});
