/**
 * Cross-essay corpus (ATLAS-501) + rich catalogue backbone (ATLAS-801 / KAN-65)
 *
 * A unified list of individual historical maps referenced across the essays,
 * each geolocated (where it depicts / was made) so the atlas can plot the whole
 * corpus on one map + timeline. Coordinates are [lng, lat] (GeoJSON order).
 *
 * This is authored data, not derived — it links a map to its source essay so
 * pins deep-link back into the essay that discusses it.
 *
 * The record schema is a *superset*: every field the collection catalogue will
 * eventually surface (cartographer, provenance, bibliography, imagery…) is
 * present but optional/defaulted, so today's 15 seed records validate unchanged.
 * The atlas map only ever consumes the `MapCore` projection (see getCorpusCore),
 * which keeps the heavyweight catalogue metadata out of the inline client
 * payload it ships to every visitor.
 */
import { z } from 'astro:content';
import { ROOM_SLUGS } from '../data/rooms';

/**
 * An inline citation on a map — a self-contained reference that isn't (yet) in
 * the shared bibliography registry. Records may instead cite a registry entry
 * by its string key; see `MapBibRefSchema` (KAN-70).
 */
export const InlineBibSchema = z.object({
  citation: z.string(),
  url: z.string().optional(),
  author: z.string().optional(),
  year: z.number().optional(),
  title: z.string().optional(),
});

/** A map cites a work either by shared-registry key (string) or inline. */
export const MapBibRefSchema = z.union([z.string(), InlineBibSchema]);
export type MapBibRef = z.infer<typeof MapBibRefSchema>;

/**
 * A reproduction / scan of the map, with attribution + licensing. When a
 * high-resolution tiled source is available (KAN-69), `dziTileSource` (a DeepZoom
 * .dzi produced by scripts/build-map-tiles.mjs) or `iiif` (an IIIF info.json)
 * opts the image into the pan/zoom viewer; `src` stays the static fallback.
 */
export const MapImageSchema = z.object({
  src: z.string(),
  alt: z.string(),
  credit: z.string().optional(),
  license: z.string().optional(),
  dziTileSource: z.string().optional(),
  iiif: z.string().optional(),
});

/**
 * The full catalogue record. `MapCoreSchema` below picks the atlas-critical
 * subset; everything outside that subset is optional and defaults to empty so
 * the existing seed data (core fields only) parses without modification.
 */
export const HistoricalMapSchema = z.object({
  // --- Atlas-critical core (mirrored by MapCoreSchema) ---
  id: z.string(),
  title: z.string(),
  year: z.number(), // negative = BC
  essaySlug: z.string(),
  region: z.string(),
  coords: z.tuple([z.number(), z.number()]), // [lng, lat]
  blurb: z.string().optional(),

  // --- Rich catalogue metadata (all optional / defaulted) ---
  cartographer: z.string().optional(), // free-text maker (display fallback)
  cartographerId: z.string().optional(), // link into the cartographer registry
  publisher: z.string().optional(),
  engraver: z.string().optional(),
  edition: z.string().optional(),
  state: z.string().optional(),
  dimensions: z.string().optional(), // e.g. "54 × 41 cm"
  scale: z.string().optional(),
  medium: z.string().optional(), // e.g. "copper engraving, hand-coloured"
  condition: z.string().optional(),
  provenance: z.string().optional(),
  acquisition: z.string().optional(),
  bibliography: z.array(MapBibRefSchema).default([]),
  relatedMapIds: z.array(z.string()).default([]),
  relatedEssaySlugs: z.array(z.string()).default([]),
  images: z.array(MapImageSchema).default([]),
  tags: z.array(z.string()).default([]),
  coveragePath: z.string().optional(), // depicted extent; fragment into the merged coverage.geojson (KAN-74)
  // Seven-room cosmography (TC-102 / KAN-93). Optional here so existing seed
  // records validate unchanged; retro-tagging lands in KAN-94.
  room: z.enum(ROOM_SLUGS).optional(),
  secondaryRooms: z.array(z.enum(ROOM_SLUGS)).max(2).default([]),
  roomAnchor: z.boolean().default(false),
});

export type HistoricalMap = z.infer<typeof HistoricalMapSchema>;

/**
 * The atlas-critical subset — exactly the fields the MapLibre island needs to
 * plot a pin, filter it, and deep-link back to its essay. AtlasMap serialises
 * *this* shape into its inline payload so rich catalogue fields never inflate
 * the bytes every visitor downloads.
 */
export const MapCoreSchema = HistoricalMapSchema.pick({
  id: true,
  title: true,
  year: true,
  essaySlug: true,
  region: true,
  coords: true,
  blurb: true,
});

export type MapCore = z.infer<typeof MapCoreSchema>;

const RAW: unknown[] = [
  // The Cartographic Sacrifice
  {
    id: 'babylonian',
    room: 'map',
    secondaryRooms: ['theatre'],
    coveragePath: '/geo/coverage.geojson#babylonian',
    title: 'Babylonian World Map',
    year: -600,
    essaySlug: 'cartography',
    region: 'Mesopotamia',
    coords: [44.42, 32.54],
    blurb: 'The Imago Mundi — earth as a disc ringed by the bitter river.',
    bibliography: ['harley-2001', 'brotton-2012'],
  },
  {
    id: 'eratosthenes',
    room: 'map',
    coveragePath: '/geo/coverage.geojson#eratosthenes',
    title: "Eratosthenes' World",
    year: -220,
    essaySlug: 'cartography',
    region: 'Alexandria',
    coords: [29.92, 31.2],
    blurb: 'A measured earth: the first grid of parallels and meridians.',
  },
  {
    id: 'hereford',
    room: 'map',
    secondaryRooms: ['theatre'],
    coveragePath: '/geo/coverage.geojson#hereford',
    title: 'Hereford Mappa Mundi',
    year: 1300,
    essaySlug: 'cartography',
    region: 'England',
    coords: [-2.72, 52.06],
    blurb: 'A theology of space with Jerusalem at the centre.',
  },
  {
    id: 'mercator',
    room: 'map',
    coveragePath: '/geo/coverage.geojson#mercator',
    title: 'Mercator Projection',
    year: 1569,
    essaySlug: 'cartography',
    region: 'Duisburg',
    coords: [6.76, 51.43],
    blurb: 'Rhumb lines made straight — navigation bought with area.',
    cartographer: 'Gerardus Mercator',
    cartographerId: 'mercator',
    bibliography: ['snyder-1993', 'brotton-2012'],
  },
  {
    id: 'cassini',
    room: 'map',
    coveragePath: '/geo/coverage.geojson#cassini',
    title: 'Carte de Cassini',
    year: 1744,
    essaySlug: 'cartography',
    region: 'France',
    coords: [2.35, 48.85],
    blurb: 'Triangulation turns a kingdom into a survey.',
    cartographer: 'César-François Cassini de Thury',
    cartographerId: 'cassini',
    bibliography: ['edney-2019'],
  },
  {
    id: 'blue-marble',
    room: 'map',
    secondaryRooms: ['earth'],
    coveragePath: '/geo/coverage.geojson#blue-marble',
    title: 'The Blue Marble',
    year: 1972,
    essaySlug: 'cartography',
    region: 'Global',
    coords: [0, 0],
    blurb: 'Earth seen whole, from outside — the photographic map.',
  },

  // La Rotta e il Catasto (Venice vs Sicily)
  {
    id: 'carta-pisana',
    room: 'road',
    coveragePath: '/geo/coverage.geojson#carta-pisana',
    title: 'Carta Pisana',
    year: 1290,
    essaySlug: 'venice-sicily',
    region: 'Mediterranean',
    coords: [9.5, 41],
    blurb: 'The oldest surviving portolan — the sea as a web of bearings.',
    bibliography: ['campbell-1987', 'harley-2001'],
    relatedEssaySlugs: ['invisible-maps-trade'],
    images: [
      {
        src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Carte%20Pisane%20Portolan.jpg?width=1600',
        alt: 'Carta Pisana, a portolan chart of the Mediterranean',
        credit: 'Bibliothèque nationale de France via Wikimedia Commons',
        license: 'Public domain',
      },
    ],
    tags: ['portolan', 'navigation', 'trade'],
  },
  {
    id: 'fra-mauro',
    room: 'road',
    secondaryRooms: ['theatre'],
    coveragePath: '/geo/coverage.geojson#fra-mauro',
    title: 'Fra Mauro world map',
    year: 1459,
    essaySlug: 'venice-sicily',
    region: 'Venice',
    coords: [12.34, 45.44],
    blurb: "Venice's encyclopaedic world, drawn south-up.",
    cartographer: 'Fra Mauro',
    cartographerId: 'fra-mauro',
    bibliography: ['harley-2001', 'brotton-2012'],
    relatedEssaySlugs: ['invisible-maps-trade'],
    images: [
      {
        src: 'https://commons.wikimedia.org/wiki/Special:FilePath/FraMauroDetailedMap.jpg?width=1600',
        alt: 'Detailed south-up world map made by Fra Mauro',
        credit: 'Biblioteca Nazionale Marciana via Wikimedia Commons',
        license: 'Public domain',
      },
    ],
    tags: ['world map', 'Venice', 'trade', 'cosmography'],
  },
  {
    id: 'idrisi',
    room: 'road',
    coveragePath: '/geo/coverage.geojson#idrisi',
    title: "Al-Idrisi's Tabula Rogeriana",
    year: 1154,
    essaySlug: 'venice-sicily',
    region: 'Sicily',
    coords: [13.36, 38.12],
    blurb: 'Made at the Norman court of Palermo for Roger II.',
    cartographer: 'Muhammad al-Idrisi',
    cartographerId: 'al-idrisi',
    bibliography: [
      'harley-2001',
      {
        citation:
          'S. Maqbul Ahmad, "Cartography of al-Sharīf al-Idrīsī", in The History of Cartography, vol. 2.1 (1992), 156–174.',
        author: 'Ahmad, S. Maqbul',
        year: 1992,
        title: 'Cartography of al-Sharīf al-Idrīsī',
      },
    ],
  },
  {
    id: 'trade-loc-portolan',
    room: 'road',
    secondaryRooms: ['border'],
    title: 'Portolan chart of the Mediterranean and Black Seas',
    year: 1335,
    essaySlug: 'invisible-maps-trade',
    region: 'Mediterranean and Black Seas',
    coords: [18, 37],
    blurb:
      'An anonymous vellum chart turns the Mediterranean and Black Seas into a continuous field of named coasts and bearings.',
    bibliography: ['campbell-1987', 'harley-2001'],
    relatedMapIds: ['carta-pisana'],
    images: [
      {
        src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Portolan%20chart%20of%20the%20Mediterranean%20Sea%20ca.%201320-1350%20-%20manuscript%20chart%20of%20the%20Mediterranean%20and%20Black%20seas%20on%20vellum.%20LOC%202003630429.jpg?width=1600',
        alt: 'Anonymous portolan chart of the Mediterranean and Black Seas',
        credit: 'Library of Congress, Geography and Map Division',
        license: 'Public domain',
      },
    ],
    tags: ['portolan', 'navigation', 'trade', 'Black Sea'],
  },
  {
    id: 'trade-vesconte-1311',
    room: 'road',
    secondaryRooms: ['map'],
    title: 'Eastern Mediterranean portolan',
    year: 1311,
    essaySlug: 'invisible-maps-trade',
    region: 'Eastern Mediterranean',
    coords: [23, 38],
    blurb:
      'Pietro Vesconte’s signed chart presents the eastern Mediterranean as an ordered sequence of coasts and crossings.',
    cartographer: 'Pietro Vesconte',
    cartographerId: 'pietro-vesconte',
    bibliography: ['campbell-1987'],
    relatedMapIds: ['trade-vesconte-1321'],
    images: [
      {
        src: 'https://commons.wikimedia.org/wiki/Special:FilePath/1311%20portolan%20of%20Pietro%20Vesconte.jpg?width=1400',
        alt: 'Pietro Vesconte portolan chart dated 1311',
        credit: 'Archivio di Stato di Firenze via Wikimedia Commons',
        license: 'Public domain',
      },
    ],
    tags: ['portolan', 'navigation', 'trade', 'eastern Mediterranean'],
  },
  {
    id: 'trade-vesconte-1321',
    room: 'road',
    secondaryRooms: ['map'],
    title: 'Western Mediterranean from a portolan atlas',
    year: 1321,
    essaySlug: 'invisible-maps-trade',
    region: 'Western Mediterranean',
    coords: [7, 40],
    blurb:
      'A western Mediterranean atlas leaf extends Vesconte’s navigational grammar across a second maritime field.',
    cartographer: 'Pietro Vesconte',
    cartographerId: 'pietro-vesconte',
    bibliography: ['campbell-1987'],
    relatedMapIds: ['trade-vesconte-1311'],
    images: [
      {
        src: 'https://commons.wikimedia.org/wiki/Special:FilePath/West%20Mediterranean%20from%20Vesconte%20c.1321%20(Lyon)%20atlas.jpg?width=1400',
        alt: 'Western Mediterranean portolan atlas leaf by Pietro Vesconte',
        credit: 'Bibliothèque municipale de Lyon via Wikimedia Commons',
        license: 'Public domain',
      },
    ],
    tags: ['portolan', 'navigation', 'trade', 'western Mediterranean'],
  },
  {
    id: 'trade-bianco-1436',
    room: 'road',
    secondaryRooms: ['map'],
    title: 'Portolan leaves from the Andrea Bianco atlas',
    year: 1436,
    essaySlug: 'invisible-maps-trade',
    region: 'Venice',
    coords: [12.34, 45.44],
    blurb:
      'Andrea Bianco’s atlas binds portolan leaves, tables and cosmographic material into one Venetian working manuscript.',
    cartographer: 'Andrea Bianco',
    cartographerId: 'andrea-bianco',
    bibliography: ['campbell-1987', 'lane-1973'],
    tags: ['atlas', 'portolan', 'Venice', 'trade'],
  },
  {
    id: 'trade-roselli-1466',
    room: 'road',
    title: 'Portolan chart of the Mediterranean',
    year: 1466,
    essaySlug: 'invisible-maps-trade',
    region: 'Mediterranean',
    coords: [2.65, 39.57],
    blurb:
      'Petrus Roselli’s chart preserves the dense coastal names and rhumb network of the Majorcan portolan tradition.',
    cartographer: 'Petrus Roselli',
    cartographerId: 'petrus-roselli',
    bibliography: ['campbell-1987'],
    images: [
      {
        src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Petrus%20Roselli%20-%20Portolan%20Chart%20of%20the%20Mediterranean%20(1466).png?width=1600',
        alt: 'Petrus Roselli portolan chart of the Mediterranean dated 1466',
        credit: 'James Ford Bell Library via Wikimedia Commons',
        license: 'Public domain',
      },
    ],
    tags: ['portolan', 'Majorca', 'navigation', 'trade'],
  },
  {
    id: 'trade-agnese-1544',
    room: 'road',
    secondaryRooms: ['theatre'],
    title: 'Portolan atlas of nine charts and a world map',
    year: 1544,
    essaySlug: 'invisible-maps-trade',
    region: 'Venice',
    coords: [12.34, 45.44],
    blurb:
      'Battista Agnese’s workshop joins navigational charts and a world map in a richly illuminated Venetian atlas.',
    cartographer: 'Battista Agnese',
    cartographerId: 'battista-agnese',
    bibliography: ['campbell-1987', 'lane-1973'],
    tags: ['atlas', 'portolan', 'Venice', 'trade'],
  },
  {
    id: 'trade-barbari-1500',
    room: 'city',
    secondaryRooms: ['road'],
    title: 'View of Venice',
    year: 1500,
    essaySlug: 'invisible-maps-trade',
    region: 'Venice',
    coords: [12.34, 45.44],
    blurb:
      'Jacopo de’ Barbari turns the lagoon into an inspectable city while the wider commercial network remains beyond the frame.',
    cartographer: 'Jacopo de’ Barbari',
    cartographerId: 'jacopo-de-barbari',
    bibliography: ['lane-1934', 'lane-1973'],
    relatedEssaySlugs: ['venice-sicily'],
    images: [
      {
        src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Jacopo_de%27_Barbari_-_View_of_Venice_-_Minneapolis_Institute_of_Art.jpg/1280px-Jacopo_de%27_Barbari_-_View_of_Venice_-_Minneapolis_Institute_of_Art.jpg',
        alt: 'Jacopo de’ Barbari bird’s-eye View of Venice',
        credit: 'Minneapolis Institute of Art',
        license: 'Public Domain Mark',
      },
    ],
    tags: ['Venice', 'city view', 'print', 'trade'],
  },

  // Speculum Chartarum
  {
    id: 'ptolemy',
    room: 'theatre',
    secondaryRooms: ['map'],
    coveragePath: '/geo/coverage.geojson#ptolemy',
    title: 'Ptolemy Geographia',
    year: 150,
    essaySlug: 'speculum',
    region: 'Alexandria',
    coords: [29.92, 31.2],
    blurb: 'Coordinates for 8,000 places — cartography as a table of numbers.',
  },
  {
    id: 'waldseemuller',
    room: 'theatre',
    secondaryRooms: ['map'],
    coveragePath: '/geo/coverage.geojson#waldseemuller',
    title: 'Waldseemüller World Map',
    year: 1507,
    essaySlug: 'speculum',
    region: 'Saint-Dié',
    coords: [6.94, 48.28],
    blurb: 'The map that first wrote "America".',
    cartographer: 'Martin Waldseemüller',
    cartographerId: 'waldseemuller',
  },
  {
    id: 'ortelius',
    room: 'theatre',
    secondaryRooms: ['map'],
    coveragePath: '/geo/coverage.geojson#ortelius',
    title: 'Ortelius Theatrum',
    year: 1570,
    essaySlug: 'speculum',
    region: 'Antwerp',
    coords: [4.4, 51.22],
    blurb: 'The first modern atlas — the world bound as a book.',
    cartographer: 'Abraham Ortelius',
    cartographerId: 'ortelius',
  },

  // Terra Sigillata (Dacia)
  {
    id: 'peutinger',
    room: 'border',
    secondaryRooms: ['road'],
    coveragePath: '/geo/coverage.geojson#peutinger',
    title: 'Tabula Peutingeriana',
    year: 400,
    essaySlug: 'dacia',
    region: 'Roman Empire',
    coords: [12.49, 41.9],
    blurb: 'The road as the unit of space — Dacia stretched along an itinerary.',
  },
  {
    id: 'honterus',
    room: 'border',
    coveragePath: '/geo/coverage.geojson#honterus',
    title: "Honterus' Transylvania",
    year: 1532,
    essaySlug: 'dacia',
    region: 'Transylvania',
    coords: [25.6, 45.65],
    blurb: 'A humanist maps his own Carpathian homeland.',
    cartographer: 'Johannes Honterus',
    cartographerId: 'honterus',
  },
  {
    id: 'specht',
    room: 'border',
    coveragePath: '/geo/coverage.geojson#specht',
    title: 'Specht Map of Dacia',
    year: 1791,
    essaySlug: 'dacia',
    region: 'Romania',
    coords: [26.1, 44.43],
    blurb: 'Habsburg military survey turns territory into administered grid.',
  },
];

// Validated at module load so a malformed record fails the build, not the browser.
export const CORPUS: HistoricalMap[] = RAW.map((m) => HistoricalMapSchema.parse(m));

export function getCorpus(): HistoricalMap[] {
  return [...CORPUS].sort((a, b) => a.year - b.year);
}

/**
 * Atlas-critical projection (ATLAS-802 / KAN-66). AtlasMap consumes *this* so
 * rich catalogue fields never enter the inline client payload. Sorted like
 * getCorpus for a stable pin/list order.
 */
export function getCorpusCore(): MapCore[] {
  return getCorpus().map((m) => MapCoreSchema.parse(m));
}

export function getMapById(id: string): HistoricalMap | undefined {
  return CORPUS.find((m) => m.id === id);
}

export function corpusYearRange(): [number, number] {
  const years = CORPUS.map((m) => m.year);
  return [Math.min(...years), Math.max(...years)];
}

/**
 * Human century label for a signed year (negative = BC), used as a catalogue
 * facet. 600 BC → "6th century BC"; AD 150 → "2nd century"; 1569 → "16th century".
 */
export function centuryLabel(year: number): string {
  const n = Math.ceil(Math.abs(year) / 100);
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? 'th'
      : n % 10 === 1
        ? 'st'
        : n % 10 === 2
          ? 'nd'
          : n % 10 === 3
            ? 'rd'
            : 'th';
  return `${n}${suffix} century${year < 0 ? ' BC' : ''}`;
}
