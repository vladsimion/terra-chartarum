import { describe, it, expect } from 'vitest';
import { toBibTeX, toRIS, toChicago, formatCitation, type CiteInput } from './cite';

const mercator: CiteInput = {
  id: 'mercator-1569',
  title: 'Nova et Aucta Orbis Terrae Descriptio',
  year: 1569,
  author: 'Gerardus Mercator',
  publisher: 'Duisburg',
  place: 'Flanders',
  url: 'https://terra-chartarum.pages.dev/collection/mercator-1569/',
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
      'howpublished= {\\url{https://terra-chartarum.pages.dev/collection/mercator-1569/}},',
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
      'Gerardus Mercator. Nova et Aucta Orbis Terrae Descriptio. Flanders: Duisburg, 1569. https://terra-chartarum.pages.dev/collection/mercator-1569/.',
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
