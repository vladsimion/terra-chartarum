/**
 * JSON-LD builders (schema.org) for the portal's indexable routes.
 *
 * Search engines read the prose, but structured data is what tells them *what
 * kind of thing* a page is: that /cartographers/mercator/ is a person who died
 * in 1594, that /collection/babylonian/ is a map made around 600 BC. For a site
 * about named historical makers and objects, that typing is the difference
 * between a page of text and an entity a search engine can place.
 *
 * These are pure functions returning plain objects - no Astro imports, no
 * rendering - so they unit-test without an Astro runtime (the same reason
 * essay-index.ts takes structural inputs rather than CollectionEntry). The
 * caller passes `Astro.site` and hands the result to PortalLayout's `schema`
 * prop, which serialises it.
 *
 * Year convention follows the corpus: negative = BC. schema.org date fields
 * expect ISO 8601, and consumers handle negative years poorly, so BC dates are
 * omitted rather than emitted in a form that would be silently misread.
 */
import type { Cartographer } from './cartographers';
import type { HistoricalMap } from './corpus';

export const SITE_NAME = 'Terra Chartarum';

/**
 * Credited as the author of every essay and as the publishing organisation.
 * Single source of truth - change it here and every JSON-LD block follows.
 */
export const SITE_AUTHOR = 'Vlad Simion';

const SITE_DESCRIPTION =
  'An interactive historical atlas - long-form visual essays on the history and politics of mapmaking.';

/** Absolute URL for a site-relative path; schema.org wants fully-qualified URLs. */
function absolute(path: string, site: URL): string {
  return new URL(path, site).toString();
}

/** The shared publisher node, repeated as the publisher of every page type. */
function organisation(site: URL) {
  return {
    '@type': 'Organization',
    name: SITE_NAME,
    url: absolute('/', site),
    logo: absolute('/og/default.png', site),
  };
}

/**
 * An ISO-8601-style year, zero-padded to four digits, sign preserved. Returns
 * null for years the date fields cannot express honestly (BC).
 */
function isoYear(year: number | undefined): string | null {
  if (year === undefined || year <= 0) return null;
  return String(year).padStart(4, '0');
}

/** Site-level identity. Emitted on the home page only. */
export function websiteSchema(site: URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: 'Terra Chartarum Atlas',
    url: absolute('/', site),
    description: SITE_DESCRIPTION,
    inLanguage: 'en-GB',
    publisher: organisation(site),
  };
}

/** The fields an essay must expose to be described as an Article. */
export interface ArticleInput {
  slug: string;
  data: {
    title: string;
    subtitle?: string;
    summary: string;
    publishedAt: string;
    updatedAt: string;
    yearFrom: number;
    yearTo: number;
    eras?: string[];
    regions?: string[];
    lenses?: string[];
  };
}

export function articleSchema(essay: ArticleInput, site: URL) {
  const { data } = essay;
  const url = absolute(`/essays/${essay.slug}/`, site);
  const keywords = [...(data.eras ?? []), ...(data.regions ?? []), ...(data.lenses ?? [])];

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title,
    ...(data.subtitle ? { alternativeHeadline: data.subtitle } : {}),
    description: data.summary,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: absolute(`/og/${essay.slug}.png`, site),
    datePublished: data.publishedAt,
    dateModified: data.updatedAt,
    author: { '@type': 'Person', name: SITE_AUTHOR },
    publisher: organisation(site),
    inLanguage: 'en-GB',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absolute('/', site) },
    // The historical span the essay covers, not when it was written. Text form:
    // the interval routinely reaches back past year zero, which the DateTime
    // form cannot carry. Negative values are BC, matching the corpus.
    temporalCoverage: `${data.yearFrom}/${data.yearTo}`,
    ...(keywords.length ? { keywords } : {}),
  };
}

/**
 * A catalogue sheet. schema.org has a native `Map` type, which is a better fit
 * than the generic CreativeWork the page would otherwise be typed as.
 */
export function mapSchema(map: HistoricalMap, site: URL, cartographer?: Cartographer) {
  const url = absolute(`/collection/${map.id}/`, site);
  const created = isoYear(map.year);
  const makerName = cartographer?.name ?? map.cartographer;

  return {
    '@context': 'https://schema.org',
    '@type': 'Map',
    name: map.title,
    ...(map.blurb ? { description: map.blurb } : {}),
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(created ? { dateCreated: created } : {}),
    ...(makerName
      ? {
          creator: {
            '@type': 'Person',
            name: makerName,
            ...(cartographer ? { url: absolute(`/cartographers/${cartographer.id}/`, site) } : {}),
          },
        }
      : {}),
    ...(map.publisher ? { publisher: { '@type': 'Organization', name: map.publisher } } : {}),
    ...(map.medium ? { artMedium: map.medium } : {}),
    ...(map.images[0] ? { image: absolute(map.images[0].src, site) } : {}),
    contentLocation: { '@type': 'Place', name: map.region },
    isPartOf: { '@type': 'Collection', name: `${SITE_NAME} collection` },
    ...(map.tags.length ? { keywords: map.tags } : {}),
  };
}

/**
 * A named maker. The registry's `links` are typically authority records
 * (Wikipedia and the like), which is exactly what `sameAs` is for - it lets a
 * search engine reconcile this page with the entity it already knows.
 */
export function personSchema(person: Cartographer, site: URL) {
  const url = absolute(`/cartographers/${person.id}/`, site);
  const born = isoYear(person.born);
  const died = isoYear(person.died);

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    description: person.bio,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    jobTitle: 'Cartographer',
    ...(born ? { birthDate: born } : {}),
    ...(died ? { deathDate: died } : {}),
    ...(person.portrait ? { image: absolute(person.portrait, site) } : {}),
    ...(person.places.length
      ? { workLocation: person.places.map((name) => ({ '@type': 'Place', name })) }
      : {}),
    ...(person.links.length ? { sameAs: person.links.map((link) => link.url) } : {}),
    knowsAbout: ['Cartography', 'History of cartography'],
  };
}

/** One rung of a breadcrumb trail: a label and the page it points at. */
/**
 * A published GIS layer, as schema.org Dataset (ATLAS-1221 / KAN-417).
 *
 * `Dataset` rather than `Map`: what is published here is the data behind a
 * drawing, and the distribution is the content-addressed asset. `version`
 * carries the content hash, so a citation and this metadata identify the same
 * bytes rather than merely the same page.
 */
export interface DatasetInput {
  layerId: string;
  title: string;
  description: string;
  licence?: string;
  version?: string;
  attribution?: string;
  temporalFrom: number;
  temporalTo: number;
  keywords?: string[];
  distribution?: { url: string; format: string; bytes?: number };
}

export function datasetSchema(input: DatasetInput, site: URL) {
  const url = absolute(`/atlas/layers/${input.layerId}/`, site);
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: input.title,
    description: input.description,
    url,
    identifier: input.layerId,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(input.version ? { version: input.version } : {}),
    ...(input.licence ? { license: input.licence } : {}),
    ...(input.attribution ? { creditText: input.attribution } : {}),
    // Negative years are BC and ISO 8601 expresses them with a leading minus.
    temporalCoverage: `${isoYear(input.temporalFrom)}/${isoYear(input.temporalTo)}`,
    creator: { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME },
    isPartOf: { '@type': 'Collection', name: `${SITE_NAME} Atlas` },
    ...(input.keywords?.length ? { keywords: input.keywords } : {}),
    ...(input.distribution
      ? {
          distribution: {
            '@type': 'DataDownload',
            contentUrl: absolute(input.distribution.url, site),
            encodingFormat: input.distribution.format,
            ...(input.distribution.bytes ? { contentSize: `${input.distribution.bytes}` } : {}),
          },
        }
      : {}),
  };
}

export interface Crumb {
  name: string;
  path: string;
}

/**
 * Breadcrumbs for the nested route families. Google renders these in place of
 * the raw URL in results, so a deep page shows its trail rather than a path.
 */
export function breadcrumbSchema(trail: Crumb[], site: URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absolute(crumb.path, site),
    })),
  };
}
