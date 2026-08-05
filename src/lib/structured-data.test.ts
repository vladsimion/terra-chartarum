import { describe, expect, it } from 'vitest';
import {
  articleSchema,
  breadcrumbSchema,
  mapSchema,
  personSchema,
  websiteSchema,
  SITE_AUTHOR,
  type ArticleInput,
} from './structured-data';
import type { Cartographer } from './cartographers';
import type { HistoricalMap } from './corpus';

const SITE = new URL('https://terra-chartarum.pages.dev');

const essay: ArticleInput = {
  slug: 'cartography',
  data: {
    title: 'The Cartographic Sacrifice',
    subtitle: 'A Non-Linear History',
    summary: 'Every projection trades one truth for another.',
    publishedAt: '2025-01-01',
    updatedAt: '2026-07-15',
    yearFrom: -600,
    yearTo: 1600,
    eras: ['antiquity'],
    regions: ['Mesopotamia'],
    lenses: ['measure'],
  },
};

const mercator = {
  id: 'mercator',
  name: 'Gerardus Mercator',
  sortName: 'Mercator, Gerardus',
  born: 1512,
  died: 1594,
  places: ['Rupelmonde', 'Duisburg'],
  bio: 'Flemish cartographer and instrument-maker.',
  essaySlugs: ['cartography'],
  links: [{ label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Gerardus_Mercator' }],
  secondaryRooms: [],
  roomAnchor: false,
} as Cartographer;

const babylonian = {
  id: 'babylonian',
  title: 'Babylonian World Map',
  year: -600,
  essaySlug: 'cartography',
  region: 'Mesopotamia',
  coords: [44.42, 32.54],
  blurb: 'Earth as a disc ringed by the bitter river.',
  bibliography: [],
  relatedMapIds: [],
  relatedEssaySlugs: [],
  images: [],
  tags: [],
  secondaryRooms: [],
  roomAnchor: false,
} as unknown as HistoricalMap;

describe('websiteSchema', () => {
  it('identifies the site with an absolute url', () => {
    const schema = websiteSchema(SITE);
    expect(schema['@type']).toBe('WebSite');
    expect(schema.url).toBe('https://terra-chartarum.pages.dev/');
    expect(schema.publisher['@type']).toBe('Organization');
  });
});

describe('articleSchema', () => {
  it('carries the frontmatter dates verbatim so the sitemap and JSON-LD agree', () => {
    const schema = articleSchema(essay, SITE);
    expect(schema.datePublished).toBe('2025-01-01');
    expect(schema.dateModified).toBe('2026-07-15');
  });

  it('points image, url and mainEntityOfPage at production', () => {
    const schema = articleSchema(essay, SITE);
    expect(schema.url).toBe('https://terra-chartarum.pages.dev/essays/cartography/');
    expect(schema.image).toBe('https://terra-chartarum.pages.dev/og/cartography.png');
    expect(schema.mainEntityOfPage['@id']).toBe(schema.url);
  });

  it('expresses a BC-to-AD span as a text interval, since DateTime cannot carry it', () => {
    expect(articleSchema(essay, SITE).temporalCoverage).toBe('-600/1600');
  });

  it('merges eras, regions and lenses into keywords', () => {
    expect(articleSchema(essay, SITE).keywords).toEqual(['antiquity', 'Mesopotamia', 'measure']);
  });

  it('omits keywords entirely when the essay is untagged', () => {
    const bare: ArticleInput = {
      ...essay,
      data: { ...essay.data, eras: [], regions: [], lenses: [] },
    };
    expect(articleSchema(bare, SITE)).not.toHaveProperty('keywords');
  });

  it('credits the single site author', () => {
    expect(articleSchema(essay, SITE).author.name).toBe(SITE_AUTHOR);
  });
});

describe('personSchema', () => {
  it('zero-pads AD life dates to ISO year form', () => {
    const schema = personSchema(mercator, SITE);
    expect(schema.birthDate).toBe('1512');
    expect(schema.deathDate).toBe('1594');
  });

  it('omits BC life dates rather than emitting a year a consumer would misread', () => {
    const ptolemy = { ...mercator, id: 'ptolemy', born: -100, died: 170 } as Cartographer;
    const schema = personSchema(ptolemy, SITE);
    expect(schema).not.toHaveProperty('birthDate');
    expect(schema.deathDate).toBe('0170');
  });

  it('exposes authority links as sameAs so the entity can be reconciled', () => {
    expect(personSchema(mercator, SITE).sameAs).toEqual([
      'https://en.wikipedia.org/wiki/Gerardus_Mercator',
    ]);
  });

  it('maps places to Place nodes', () => {
    expect(personSchema(mercator, SITE).workLocation).toEqual([
      { '@type': 'Place', name: 'Rupelmonde' },
      { '@type': 'Place', name: 'Duisburg' },
    ]);
  });
});

describe('mapSchema', () => {
  it('uses the native Map type', () => {
    expect(mapSchema(babylonian, SITE)['@type']).toBe('Map');
  });

  it('omits dateCreated for a BC sheet', () => {
    expect(mapSchema(babylonian, SITE)).not.toHaveProperty('dateCreated');
  });

  it('links the creator to their profile when the registry resolves them', () => {
    const sheet = {
      ...babylonian,
      id: 'mercator-1569',
      year: 1569,
      cartographerId: 'mercator',
    } as HistoricalMap;
    const schema = mapSchema(sheet, SITE, mercator);
    expect(schema.dateCreated).toBe('1569');
    expect(schema.creator).toMatchObject({
      name: 'Gerardus Mercator',
      url: 'https://terra-chartarum.pages.dev/cartographers/mercator/',
    });
  });

  it('falls back to the free-text maker with no profile link', () => {
    const sheet = { ...babylonian, cartographer: 'Anonymous' } as HistoricalMap;
    const schema = mapSchema(sheet, SITE);
    expect(schema.creator).toEqual({ '@type': 'Person', name: 'Anonymous' });
  });

  it('omits creator when nothing is known about the maker', () => {
    expect(mapSchema(babylonian, SITE)).not.toHaveProperty('creator');
  });
});

describe('breadcrumbSchema', () => {
  it('numbers the trail from one and absolutises each rung', () => {
    const schema = breadcrumbSchema(
      [
        { name: 'Essays', path: '/essays/' },
        { name: 'The Cartographic Sacrifice', path: '/essays/cartography/' },
      ],
      SITE,
    );
    expect(schema.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Essays',
        item: 'https://terra-chartarum.pages.dev/essays/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'The Cartographic Sacrifice',
        item: 'https://terra-chartarum.pages.dev/essays/cartography/',
      },
    ]);
  });
});
