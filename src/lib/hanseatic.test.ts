import { describe, expect, it } from 'vitest';
import { parseAtlasShareState } from './atlas-share';
import { getHanseaticPlacePhase, toHanseaticAtlasHref } from './hanseatic';

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
