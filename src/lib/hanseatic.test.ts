import { describe, expect, it } from 'vitest';
import { parseAtlasShareState } from './atlas-share';
import {
  getHanseaticKontor,
  getHanseaticPlacePhase,
  isPending,
  listHanseaticKontore,
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
