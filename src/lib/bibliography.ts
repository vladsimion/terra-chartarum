/**
 * Bibliography registry (ATLAS-806 / KAN-70)
 *
 * A shared, id-keyed set of scholarly works. Corpus maps cite a work either by
 * its registry key (a string) or with a self-contained inline entry; this module
 * resolves both into a uniform `BibEntry` and powers the /bibliography page.
 *
 * Validated at module load so a malformed entry fails the build, not the browser.
 */
import { z } from 'astro:content';
import { getCorpus } from './corpus';
import type { HistoricalMap, MapBibRef } from './corpus';

export const BibEntrySchema = z.object({
  id: z.string(),
  author: z.string().optional(), // "Surname, Forename" for sorting
  year: z.number().optional(),
  title: z.string().optional(),
  citation: z.string(), // full formatted citation for display
  url: z.string().optional(),
});

export type BibEntry = z.infer<typeof BibEntrySchema>;

const RAW: unknown[] = [
  {
    id: 'harley-2001',
    author: 'Harley, J. B.',
    year: 2001,
    title: 'The New Nature of Maps: Essays in the History of Cartography',
    citation:
      'Harley, J. B. The New Nature of Maps: Essays in the History of Cartography. Baltimore: Johns Hopkins University Press, 2001.',
  },
  {
    id: 'snyder-1993',
    author: 'Snyder, John P.',
    year: 1993,
    title: 'Flattening the Earth: Two Thousand Years of Map Projections',
    citation:
      'Snyder, John P. Flattening the Earth: Two Thousand Years of Map Projections. Chicago: University of Chicago Press, 1993.',
  },
  {
    id: 'brotton-2012',
    author: 'Brotton, Jerry',
    year: 2012,
    title: 'A History of the World in Twelve Maps',
    citation: 'Brotton, Jerry. A History of the World in Twelve Maps. London: Allen Lane, 2012.',
  },
  {
    id: 'edney-2019',
    author: 'Edney, Matthew H.',
    year: 2019,
    title: 'Cartography: The Ideal and Its History',
    citation:
      'Edney, Matthew H. Cartography: The Ideal and Its History. Chicago: University of Chicago Press, 2019.',
  },
];

export const BIBLIOGRAPHY: BibEntry[] = RAW.map((b) => BibEntrySchema.parse(b));

const BY_ID = new Map(BIBLIOGRAPHY.map((b) => [b.id, b]));

export function getBibEntryById(id: string): BibEntry | undefined {
  return BY_ID.get(id);
}

/** A stable synthetic id for an inline citation (keyed off its text). */
function inlineId(citation: string): string {
  let h = 0;
  for (let i = 0; i < citation.length; i++) h = (h * 31 + citation.charCodeAt(i)) | 0;
  return `inline-${(h >>> 0).toString(36)}`;
}

/** Coerce a single map citation reference into a full BibEntry. */
function resolveRef(ref: MapBibRef): BibEntry | undefined {
  if (typeof ref === 'string') return getBibEntryById(ref);
  return { id: inlineId(ref.citation), ...ref };
}

/** All resolved citations for a map, in declaration order. */
export function resolveMapBibliography(map: HistoricalMap): BibEntry[] {
  return map.bibliography.map(resolveRef).filter((b): b is BibEntry => Boolean(b));
}

/** Maps that cite a given bibliography id, for the page's back-links. */
export function getCitingMaps(bibId: string): HistoricalMap[] {
  return getCorpus().filter((m) => resolveMapBibliography(m).some((b) => b.id === bibId));
}

const authorKey = (b: BibEntry) => (b.author ?? b.citation).toLowerCase();

/**
 * The whole bibliography: every registry entry plus every inline citation used
 * across the corpus, deduped by id and sorted by author then year (ATLAS-1103).
 */
export function getFullBibliography(): BibEntry[] {
  const all = new Map<string, BibEntry>();
  for (const b of BIBLIOGRAPHY) all.set(b.id, b);
  for (const m of getCorpus()) {
    for (const b of resolveMapBibliography(m)) if (!all.has(b.id)) all.set(b.id, b);
  }
  return [...all.values()].sort((a, b) => {
    const byAuthor = authorKey(a).localeCompare(authorKey(b));
    return byAuthor !== 0 ? byAuthor : (a.year ?? 0) - (b.year ?? 0);
  });
}
