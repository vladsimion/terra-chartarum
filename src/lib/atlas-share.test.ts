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
      feature: 'hse-place-lubeck-leading-1358',
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
      feature: 'hse-place-lubeck-leading-1358',
      toponyms: true,
      // Catalogue state (KAN-405) is absent from a legacy link and stays absent.
      lens: undefined,
      collection: undefined,
      layer: undefined,
      relevant: false,
    });
  });

  it('drops invalid IDs and non-finite numbers', () => {
    expect(
      parseAtlasShareState(
        '?essay=../../bad&covers=ok-id&layers=good,bad!,also_good&feature=bad!&year=nope',
      ),
    ).toEqual({
      query: undefined,
      essay: undefined,
      region: undefined,
      covers: 'ok-id',
      year: undefined,
      zoom: undefined,
      layers: ['good', 'also_good'],
      feature: undefined,
      toponyms: false,
      lens: undefined,
      collection: undefined,
      layer: undefined,
      relevant: false,
    });
  });
});

// Catalogue and collection state (ATLAS-1209 / KAN-405). The existing keys are
// untouched above, which is the point: essay deep links already in published
// prose have to keep working.
describe('Atlas catalogue share state', () => {
  it('round-trips lens, collection context, inspected layer and year relevance', () => {
    const url = buildAtlasShareUrl('https://example.test/atlas/', {
      year: 1400,
      lens: 'collections',
      collection: 'venetian-maritime-network',
      layers: ['venetian-routes', 'venetian-ports'],
      layer: 'venetian-routes',
      relevant: true,
    });
    expect(new URL(url).search).toBe(
      '?year=1400&layers=venetian-ports%2Cvenetian-routes&lens=collections' +
        '&collection=venetian-maritime-network&layer=venetian-routes&relevant=1',
    );
    const parsed = parseAtlasShareState(new URL(url).search);
    expect(parsed.lens).toBe('collections');
    expect(parsed.collection).toBe('venetian-maritime-network');
    expect(parsed.layer).toBe('venetian-routes');
    expect(parsed.relevant).toBe(true);
  });

  it('normalises layer order so two equivalent views share one URL', () => {
    const a = buildAtlasShareUrl('https://example.test/atlas/', {
      layers: ['venetian-routes', 'venetian-ports'],
    });
    const b = buildAtlasShareUrl('https://example.test/atlas/', {
      layers: ['venetian-ports', 'venetian-routes', 'venetian-ports'],
    });
    expect(a).toBe(b);
  });

  it('keeps collection context separate from the composition', () => {
    // Arriving through a collection shows the argument; it does not draw it.
    const parsed = parseAtlasShareState('?collection=hanseatic-world');
    expect(parsed.collection).toBe('hanseatic-world');
    expect(parsed.layers).toBeUndefined();
  });

  it('drops an unrecognised lens rather than restoring a broken view', () => {
    expect(parseAtlasShareState('?lens=galaxies').lens).toBeUndefined();
    expect(parseAtlasShareState('?lens=rooms').lens).toBe('rooms');
  });

  it('rejects unsafe collection and layer identifiers', () => {
    const parsed = parseAtlasShareState('?collection=../../etc&layer=drop%20table');
    expect(parsed.collection).toBeUndefined();
    expect(parsed.layer).toBeUndefined();
  });

  it('omits catalogue keys entirely when they carry no meaning', () => {
    const url = buildAtlasShareUrl('https://example.test/atlas/', { year: 1400 });
    expect(new URL(url).search).toBe('?year=1400');
  });
});
