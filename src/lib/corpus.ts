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

/**
 * A cited work — flexible enough for a one-line reference or a structured entry.
 */
export const BibEntrySchema = z.object({
  citation: z.string(),
  url: z.string().optional(),
});

/** A reproduction / scan of the map, with attribution + licensing. */
export const MapImageSchema = z.object({
  src: z.string(),
  alt: z.string(),
  credit: z.string().optional(),
  license: z.string().optional(),
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
  cartographer: z.string().optional(),
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
  bibliography: z.array(BibEntrySchema).default([]),
  relatedMapIds: z.array(z.string()).default([]),
  relatedEssaySlugs: z.array(z.string()).default([]),
  images: z.array(MapImageSchema).default([]),
  tags: z.array(z.string()).default([]),
  coveragePath: z.string().optional(), // GeoJSON asset outlining depicted extent
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
  { id: 'babylonian', title: 'Babylonian World Map', year: -600, essaySlug: 'cartography', region: 'Mesopotamia', coords: [44.42, 32.54], blurb: 'The Imago Mundi — earth as a disc ringed by the bitter river.' },
  { id: 'eratosthenes', title: "Eratosthenes' World", year: -220, essaySlug: 'cartography', region: 'Alexandria', coords: [29.92, 31.2], blurb: 'A measured earth: the first grid of parallels and meridians.' },
  { id: 'hereford', title: 'Hereford Mappa Mundi', year: 1300, essaySlug: 'cartography', region: 'England', coords: [-2.72, 52.06], blurb: 'A theology of space with Jerusalem at the centre.' },
  { id: 'mercator', title: 'Mercator Projection', year: 1569, essaySlug: 'cartography', region: 'Duisburg', coords: [6.76, 51.43], blurb: 'Rhumb lines made straight — navigation bought with area.' },
  { id: 'cassini', title: 'Carte de Cassini', year: 1744, essaySlug: 'cartography', region: 'France', coords: [2.35, 48.85], blurb: 'Triangulation turns a kingdom into a survey.' },
  { id: 'blue-marble', title: 'The Blue Marble', year: 1972, essaySlug: 'cartography', region: 'Global', coords: [0, 0], blurb: 'Earth seen whole, from outside — the photographic map.' },

  // La Rotta e il Catasto (Venice vs Sicily)
  { id: 'carta-pisana', title: 'Carta Pisana', year: 1290, essaySlug: 'venice-sicily', region: 'Mediterranean', coords: [9.5, 41], blurb: 'The oldest surviving portolan — the sea as a web of bearings.' },
  { id: 'fra-mauro', title: 'Fra Mauro Map', year: 1450, essaySlug: 'venice-sicily', region: 'Venice', coords: [12.34, 45.44], blurb: "Venice's encyclopaedic world, drawn south-up." },
  { id: 'idrisi', title: "Al-Idrisi's Tabula Rogeriana", year: 1154, essaySlug: 'venice-sicily', region: 'Sicily', coords: [13.36, 38.12], blurb: 'Made at the Norman court of Palermo for Roger II.' },

  // Speculum Chartarum
  { id: 'ptolemy', title: 'Ptolemy Geographia', year: 150, essaySlug: 'speculum', region: 'Alexandria', coords: [29.92, 31.2], blurb: 'Coordinates for 8,000 places — cartography as a table of numbers.' },
  { id: 'waldseemuller', title: 'Waldseemüller World Map', year: 1507, essaySlug: 'speculum', region: 'Saint-Dié', coords: [6.94, 48.28], blurb: 'The map that first wrote "America".' },
  { id: 'ortelius', title: 'Ortelius Theatrum', year: 1570, essaySlug: 'speculum', region: 'Antwerp', coords: [4.4, 51.22], blurb: 'The first modern atlas — the world bound as a book.' },

  // Terra Sigillata (Dacia)
  { id: 'peutinger', title: 'Tabula Peutingeriana', year: 400, essaySlug: 'dacia', region: 'Roman Empire', coords: [12.49, 41.9], blurb: 'The road as the unit of space — Dacia stretched along an itinerary.' },
  { id: 'honterus', title: "Honterus' Transylvania", year: 1532, essaySlug: 'dacia', region: 'Transylvania', coords: [25.6, 45.65], blurb: 'A humanist maps his own Carpathian homeland.' },
  { id: 'specht', title: 'Specht Map of Dacia', year: 1791, essaySlug: 'dacia', region: 'Romania', coords: [26.1, 44.43], blurb: 'Habsburg military survey turns territory into administered grid.' },
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
