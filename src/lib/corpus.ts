/**
 * Cross-essay corpus (ATLAS-501)
 *
 * A unified list of individual historical maps referenced across the essays,
 * each geolocated (where it depicts / was made) so the atlas can plot the whole
 * corpus on one map + timeline. Coordinates are [lng, lat] (GeoJSON order).
 *
 * This is authored data, not derived — it links a map to its source essay so
 * pins deep-link back into the essay that discusses it.
 */
export interface HistoricalMap {
  id: string;
  title: string;
  year: number; // negative = BC
  essaySlug: string;
  region: string;
  coords: [number, number]; // [lng, lat]
  blurb?: string;
}

export const CORPUS: HistoricalMap[] = [
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

export function getCorpus(): HistoricalMap[] {
  return [...CORPUS].sort((a, b) => a.year - b.year);
}

export function corpusYearRange(): [number, number] {
  const years = CORPUS.map((m) => m.year);
  return [Math.min(...years), Math.max(...years)];
}
