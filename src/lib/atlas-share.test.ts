import { describe, expect, it } from 'vitest';
import { buildAtlasShareUrl, parseAtlasShareState } from './atlas-share';

describe('Atlas share state', () => {
  it('round-trips visible controls and preserves a focused feature', () => {
    const url = buildAtlasShareUrl('https://example.test/atlas/?port=venice#topo-venice', {
      query: 'portolan',
      essay: 'venice-sicily',
      region: 'Adriatic',
      covers: 'fra-mauro',
      year: 1450,
      zoom: 5.25,
      layers: ['venetian-routes', 'venetian-ports', 'venetian-routes'],
      toponyms: true,
    });
    const parsedUrl = new URL(url);
    expect(parsedUrl.searchParams.get('port')).toBe('venice');
    expect(parsedUrl.hash).toBe('#topo-venice');
    expect(parseAtlasShareState(parsedUrl.search)).toEqual({
      query: 'portolan',
      essay: 'venice-sicily',
      region: 'Adriatic',
      covers: 'fra-mauro',
      year: 1450,
      zoom: 5.25,
      layers: ['venetian-ports', 'venetian-routes'],
      toponyms: true,
    });
  });

  it('drops invalid IDs and non-finite numbers', () => {
    expect(
      parseAtlasShareState('?essay=../../bad&covers=ok-id&layers=good,bad!,also_good&year=nope'),
    ).toEqual({
      query: undefined,
      essay: undefined,
      region: undefined,
      covers: 'ok-id',
      year: undefined,
      zoom: undefined,
      layers: ['good', 'also_good'],
      toponyms: false,
    });
  });
});
