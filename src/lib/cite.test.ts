import { describe, it, expect } from 'vitest';
import { toBibTeX, toRIS, toChicago, formatCitation, type CiteInput } from './cite';

const mercator: CiteInput = {
  id: 'mercator-1569',
  title: 'Nova et Aucta Orbis Terrae Descriptio',
  year: 1569,
  author: 'Gerardus Mercator',
  publisher: 'Duisburg',
  place: 'Flanders',
  url: 'https://terra-chartarum.org/collection/mercator-1569/',
};

const babylonian: CiteInput = {
  id: 'babylonian-world-map',
  title: 'Imago Mundi',
  year: -600,
};

describe('toBibTeX', () => {
  it('emits a @misc entry keyed by id with escaped fields', () => {
    const out = toBibTeX(mercator);
    expect(out.startsWith('@misc{mercator-1569,')).toBe(true);
    expect(out).toContain('title       = {Nova et Aucta Orbis Terrae Descriptio},');
    expect(out).toContain('author      = {Gerardus Mercator},');
    expect(out).toContain('year        = {1569},');
    expect(out).toContain(
      'howpublished= {\\url{https://terra-chartarum.org/collection/mercator-1569/}},',
    );
    expect(out.trimEnd().endsWith('}')).toBe(true);
  });

  it('omits absent optional fields and renders BC years', () => {
    const out = toBibTeX(babylonian);
    expect(out).toContain('year        = {600 BC},');
    expect(out).not.toContain('author');
    expect(out).not.toContain('publisher');
  });
});

describe('toRIS', () => {
  it('wraps the record in TY/ER tags with mapped fields', () => {
    const out = toRIS(mercator);
    expect(out.startsWith('TY  - MAP')).toBe(true);
    expect(out).toContain('AU  - Gerardus Mercator');
    expect(out).toContain('PY  - 1569');
    expect(out.split('\n').at(-1)).toBe('ER  - ');
  });

  it('drops tags for missing values', () => {
    const out = toRIS(babylonian);
    expect(out).not.toContain('AU  -');
    expect(out).toContain('PY  - 600 BC');
  });
});

describe('toChicago', () => {
  it('assembles author, title, imprint, year and url', () => {
    expect(toChicago(mercator)).toBe(
      'Gerardus Mercator. Nova et Aucta Orbis Terrae Descriptio. Flanders: Duisburg, 1569. https://terra-chartarum.org/collection/mercator-1569/.',
    );
  });

  it('handles a bare record with only title and BC year', () => {
    expect(toChicago(babylonian)).toBe('Imago Mundi. 600 BC.');
  });
});

describe('formatCitation', () => {
  it('dispatches to the requested formatter', () => {
    expect(formatCitation(mercator, 'bibtex')).toBe(toBibTeX(mercator));
    expect(formatCitation(mercator, 'ris')).toBe(toRIS(mercator));
    expect(formatCitation(mercator, 'chicago')).toBe(toChicago(mercator));
  });
});

describe('resource types', () => {
  it('formats an essay as an electronic resource', () => {
    const essay: CiteInput = {
      id: 'cities-remember',
      kind: 'essay',
      title: 'Cities Remember',
      author: 'Terra Chartarum',
      year: 2026,
      containerTitle: 'Terra Chartarum',
      url: 'https://terra-chartarum.org/essays/cities-remember/',
    };
    expect(toRIS(essay)).toContain('TY  - ELEC');
    expect(toRIS(essay)).toContain('T2  - Terra Chartarum');
    expect(toBibTeX(essay)).toContain('note        = {Visual essay. Terra Chartarum.}');
  });

  it('formats a versioned dataset without requiring an invented year', () => {
    const dataset: CiteInput = {
      id: 'venetian-ports-4440ae3946c6',
      kind: 'dataset',
      title: 'Venetian maritime ports, c.1200–1500',
      author: 'Terra Chartarum',
      version: '4440ae3946c6',
      license: 'CC BY',
      url: 'https://terra-chartarum.org/geo/venetian-ports.fgb?v=4440ae3946c6',
    };
    expect(toRIS(dataset)).toContain('TY  - DATA');
    expect(toRIS(dataset)).not.toContain('PY  -');
    expect(toChicago(dataset)).toContain('Version 4440ae3946c6. Dataset. CC BY.');
  });
});

describe('dataset access details (KAN-311)', () => {
  const dataset: CiteInput = {
    id: 'hanseatic-places-d4b58778da67',
    kind: 'dataset',
    title: 'Hanseatic places - Phase 0 fixture',
    author: 'Terra Chartarum',
    version: 'd4b58778da67',
    license: 'CC BY 4.0',
    url: 'https://terra-chartarum.org/geo/hanseatic-places.geojson?v=d4b58778da67',
    release: 'geo-6065acdaeddddd80',
    checksum: 'd4b58778da67aa11bb22cc33dd44ee55ff6677889900aabbccddeeff00112233',
  };

  it('pins retrieval by release and checksum in every format', () => {
    for (const rendered of [toBibTeX(dataset), toRIS(dataset), toChicago(dataset)]) {
      expect(rendered).toContain('Release geo-6065acdaeddddd80');
      expect(rendered).toContain('SHA-256 d4b58778da67aa11');
    }
  });

  it('keeps the version alongside the access details', () => {
    expect(toBibTeX(dataset)).toContain('version     = {d4b58778da67}');
    expect(toRIS(dataset)).toContain('ET  - d4b58778da67');
    expect(toChicago(dataset)).toContain('Version d4b58778da67.');
  });

  it('omits the access note entirely when a resource has no release', () => {
    const map: CiteInput = { id: 'x', title: 'A map', year: 1500 };
    for (const rendered of [toBibTeX(map), toRIS(map), toChicago(map)]) {
      expect(rendered).not.toContain('Release');
      expect(rendered).not.toContain('SHA-256');
    }
  });
});
