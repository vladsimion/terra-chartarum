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
  {
    id: 'campbell-1987',
    author: 'Campbell, Tony',
    year: 1987,
    title: 'Portolan Charts from the Late Thirteenth Century to 1500',
    citation:
      'Campbell, Tony. “Portolan Charts from the Late Thirteenth Century to 1500.” In The History of Cartography, vol. 1. Chicago: University of Chicago Press, 1987.',
    url: 'https://press.uchicago.edu/books/HOC/HOC_V1/HOC_VOLUME1_chapter19.pdf',
  },
  {
    id: 'lane-1934',
    author: 'Lane, Frederic C.',
    year: 1934,
    title: 'Venetian Ships and Shipbuilders of the Renaissance',
    citation:
      'Lane, Frederic C. Venetian Ships and Shipbuilders of the Renaissance. Baltimore: Johns Hopkins University Press, 1934.',
  },
  {
    id: 'lane-1973',
    author: 'Lane, Frederic C.',
    year: 1973,
    title: 'Venice: A Maritime Republic',
    citation:
      'Lane, Frederic C. Venice: A Maritime Republic. Baltimore: Johns Hopkins University Press, 1973.',
  },
  {
    id: 'oconnell-2009',
    author: 'O’Connell, Monique',
    year: 2009,
    title: 'Men of Empire: Power and Negotiation in Venice’s Maritime State',
    citation:
      'O’Connell, Monique. Men of Empire: Power and Negotiation in Venice’s Maritime State. Baltimore: Johns Hopkins University Press, 2009.',
  },
  {
    id: 'woodward-1987-mappaemundi',
    author: 'Woodward, David',
    year: 1987,
    title: 'Medieval Mappaemundi',
    citation:
      'Woodward, David. “Medieval Mappaemundi.” In The History of Cartography, vol. 1, 286–370. Chicago: University of Chicago Press, 1987.',
    url: 'https://press.uchicago.edu/books/hoc/HOC_V1/HOC_VOLUME1_chapter18.pdf',
  },
  {
    id: 'edson-1997',
    author: 'Edson, Evelyn',
    year: 1997,
    title: 'Mapping Time and Space: How Medieval Mapmakers Viewed Their World',
    citation:
      'Edson, Evelyn. Mapping Time and Space: How Medieval Mapmakers Viewed Their World. London: British Library, 1997.',
  },
  {
    id: 'hereford-cathedral',
    author: 'Hereford Cathedral',
    year: 2021,
    title: 'Mappa Mundi',
    citation: 'Hereford Cathedral. “Mappa Mundi.” Collection guide, updated 20 July 2021.',
    url: 'https://www.herefordcathedral.org/mappa-mundi',
  },
  {
    id: 'bl-royal-14-c-vii',
    author: 'British Library',
    title: 'Royal MS 14 C VII',
    citation:
      'British Library. Royal MS 14 C VII, Matthew Paris, Historia Anglorum and prefatory itinerary materials. Archives and Manuscripts Catalogue.',
    url: 'https://searcharchives.bl.uk/catalog/040-002106988',
  },
  {
    id: 'loc-rudimentum',
    author: 'Library of Congress',
    year: 1475,
    title: 'Rudimentum Novitiorum',
    citation:
      'Library of Congress. Rudimentum Novitiorum. Lübeck: Lucas Brandis, 5 August 1475. Lessing J. Rosenwald Collection.',
    url: 'https://www.loc.gov/item/48043282/',
  },
  {
    id: 'vandenbroecke-1996',
    author: 'Van den Broecke, Marcel P. R.',
    year: 1996,
    title: 'Ortelius Atlas Maps: An Illustrated Guide',
    citation:
      'Van den Broecke, Marcel P. R. Ortelius Atlas Maps: An Illustrated Guide. ’t Goy-Houten: HES Publishers, 1996.',
    url: 'https://orteliusmaps.com/ortindexnumber.html',
  },
  {
    id: 'vandenbroecke-ort1',
    author: 'Van den Broecke, Marcel P. R.',
    title: 'Ortelius Map No. 1: Typus Orbis Terrarum',
    citation:
      'Van den Broecke, Marcel P. R. “Ortelius Map No. 1: Typus Orbis Terrarum.” Cartographica Neerlandica.',
    url: 'https://orteliusmaps.com/book/ort1.html',
  },
  {
    id: 'vandenbroecke-ort2',
    author: 'Van den Broecke, Marcel P. R.',
    title: 'Ortelius Map No. 2: Typus Orbis Terrarum',
    citation:
      'Van den Broecke, Marcel P. R. “Ortelius Map No. 2: Typus Orbis Terrarum.” Cartographica Neerlandica.',
    url: 'https://orteliusmaps.com/book/ort2.html',
  },
  {
    id: 'vandenbroecke-ort3',
    author: 'Van den Broecke, Marcel P. R.',
    title: 'Ortelius Map No. 3: Typus Orbis Terrarum',
    citation:
      'Van den Broecke, Marcel P. R. “Ortelius Map No. 3: Typus Orbis Terrarum.” Cartographica Neerlandica.',
    url: 'https://orteliusmaps.com/book/ort3.html',
  },
  {
    id: 'loc-ortelius',
    author: 'Library of Congress',
    title: 'Ortelius Atlas',
    citation: 'Library of Congress. “Ortelius Atlas.” General Atlases, Geography and Map Division.',
    url: 'https://www.loc.gov/collections/general-maps/articles-and-essays/general-atlases/ortelius-atlas/',
  },
  {
    id: 'nuti-2003',
    author: 'Nuti, Lucia',
    year: 2003,
    title: 'The World Map as an Emblem: Abraham Ortelius and the Stoic Contemplation',
    citation:
      'Nuti, Lucia. “The World Map as an Emblem: Abraham Ortelius and the Stoic Contemplation.” Imago Mundi 55 (2003): 38–55.',
  },
  {
    id: 'stanford-forma-urbis',
    author: 'Trimble, Jennifer; Levoy, Marc; Najbjerg, Tina',
    title: 'Stanford Digital Forma Urbis Romae Project',
    citation:
      'Trimble, Jennifer, Marc Levoy and Tina Najbjerg. Stanford Digital Forma Urbis Romae Project. Stanford University.',
    url: 'https://formaurbis.stanford.edu/docs/FURproject.html',
  },
  {
    id: 'mia-barbari',
    author: 'Minneapolis Institute of Art',
    year: 1500,
    title: 'Jacopo de’ Barbari, View of Venice',
    citation:
      'Minneapolis Institute of Art. Jacopo de’ Barbari, View of Venice, 1500. Accession 2010.88.',
    url: 'https://collections.artsmia.org/art/111219/view-of-venice-jacopo-de-barbari',
  },
  {
    id: 'moeml-agas',
    author: 'Map of Early Modern London',
    title: 'The Agas Map of Early Modern London',
    citation:
      'Map of Early Modern London. “The Agas Map of Early Modern London.” University of Victoria.',
    url: 'https://mapoflondon.uvic.ca/agas.htm',
  },
  {
    id: 'loc-civitates',
    author: 'Library of Congress',
    year: 1572,
    title: 'Civitates Orbis Terrarum',
    citation:
      'Library of Congress. Braun, Georg, Frans Hogenberg et al. Civitates Orbis Terrarum. Six-volume digitised atlas witness.',
    url: 'https://www.loc.gov/item/2008627031/',
  },
  {
    id: 'tice-steiner-nolli',
    author: 'Tice, James; Steiner, Erik',
    title: 'The Interactive Nolli Map Website',
    citation:
      'Tice, James and Erik Steiner. The Interactive Nolli Map Website. University of Oregon.',
    url: 'https://nolli.uoregon.edu/',
  },
  {
    id: 'loc-sanborn-guide',
    author: 'Library of Congress',
    title: 'About the Sanborn Maps Collection',
    citation:
      'Library of Congress. “About this Collection.” Sanborn Maps, Geography and Map Division.',
    url: 'https://www.loc.gov/collections/sanborn-maps/about-this-collection/',
  },
  {
    id: 'boutier-2007',
    author: 'Boutier, Jean',
    year: 2007,
    title: 'Les Plans de Paris',
    citation:
      'Boutier, Jean. Les Plans de Paris: des origines (1493) à la fin du XVIIIe siècle. 2nd ed. Paris: Bibliothèque nationale de France, 2007.',
  },
  {
    id: 'loc-nuremberg-chronicle',
    author: 'Library of Congress',
    year: 1493,
    title: 'Liber chronicarum (Nuremberg Chronicle)',
    citation:
      'Library of Congress. Schedel, Hartmann. Liber chronicarum. Nuremberg: Anton Koberger, 1493. World Digital Library record.',
    url: 'https://www.loc.gov/item/2021667043/',
  },
  {
    id: 'wubs-mrozewicz-2013-hanse',
    author: 'Wubs-Mrozewicz, Justyna',
    year: 2013,
    title: 'The Hanse in Medieval and Early Modern Europe: An Introduction',
    citation:
      'Wubs-Mrozewicz, Justyna. “The Hanse in Medieval and Early Modern Europe: An Introduction.” In The Hanse in Medieval and Early Modern Europe, edited by Justyna Wubs-Mrozewicz and Stuart Jenks, 1–24. Leiden: Brill, 2013.',
    url: 'https://doi.org/10.1163/9789004241930_002',
  },
  {
    id: 'marczinek-maurer-rauch-2025',
    author: 'Marczinek, Max; Maurer, Stephan; Rauch, Ferdinand',
    year: 2025,
    title: 'Networks in trade - Evidence from the legacy of the Hanseatic league',
    citation:
      'Marczinek, Max, Stephan Maurer and Ferdinand Rauch. “Networks in trade - Evidence from the legacy of the Hanseatic league.” Journal of International Economics 157 (2025): 104102.',
    url: 'https://doi.org/10.1016/j.jinteco.2025.104102',
  },
  {
    id: 'marczinek-maurer-rauch-data-2025',
    author: 'Marczinek, Max; Maurer, Stephan; Rauch, Ferdinand',
    year: 2025,
    title: 'Networks in Trade - Evidence from the Legacy of the Hanseatic League: replication data',
    citation:
      'Marczinek, Max, Stephan Maurer and Ferdinand Rauch. Networks in Trade - Evidence from the Legacy of the Hanseatic League. Replication data, Mendeley Data, version 1, 2025.',
    url: 'https://doi.org/10.17632/m3w5by2gdh.1',
  },
  {
    id: 'henn-2017-zuiderzee',
    author: 'Henn, Volker',
    year: 2017,
    title: 'Die Städte an Zuiderzee und IJssel auf den Hansetagen',
    citation:
      'Henn, Volker. “Die Städte an Zuiderzee und IJssel auf den Hansetagen.” Hansische Geschichtsblätter 135 (2017).',
    url: 'https://doi.org/10.21248/hgbll.2017.83',
  },
  {
    id: 'lambert-sicking-2025',
    author: 'Lambert, Bart; Sicking, Louis',
    year: 2025,
    title:
      'Counts, cities and commerce: a comparative study of the institutional foundations of international trade in late medieval Flanders, Holland and Zeeland',
    citation:
      'Lambert, Bart and Louis Sicking. “Counts, cities and commerce: a comparative study of the institutional foundations of international trade in late medieval Flanders, Holland and Zeeland.” Continuity and Change 39, no. 3 (2024): 309–343; published online 2025.',
    url: 'https://doi.org/10.1017/S0268416025000049',
  },
  {
    id: 'unesco-hanse-documents-2017',
    author: 'Archives of the Hanse',
    year: 2017,
    title: 'Documents on the History of the Hanse',
    citation:
      'Archives of the Hanse. Documents on the History of the Hanse. UNESCO Memory of the World International Register nomination dossier, 2017.',
    url: 'https://media.unesco.org/sites/default/files/webform/mow001/documents-on-the-history-of-the-hanse_nom_en_0.pdf',
  },
  {
    id: 'unesco-bryggen',
    author: 'UNESCO World Heritage Centre',
    title: 'Bryggen',
    citation:
      'UNESCO World Heritage Centre. “Bryggen.” World Heritage List no. 59, statement of Outstanding Universal Value.',
    url: 'https://whc.unesco.org/en/list/59',
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
