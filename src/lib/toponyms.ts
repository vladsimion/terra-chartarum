/**
 * Toponym concordance (ATLAS-1003 / KAN-75)
 *
 * Authored gazetteer of places that recur across the corpus, each carrying its
 * modern name plus the ancient / medieval / variant names by which the maps and
 * essays call it. Coordinates are [lng, lat] (GeoJSON order). Drives three
 * consumers from one source: the /geo/toponyms.geojson endpoint, a dedicated
 * toggleable pin set on the atlas (multi-name popups), and the search index.
 *
 * `pleiadesId` links a place to the Pleiades gazetteer for future interoperability
 * (KAN-46); only populated where the identifier is verified, left empty otherwise.
 */
import { z } from 'astro:content';

export const ToponymSchema = z.object({
  id: z.string(),
  modern: z.string(),
  ancient: z.array(z.string()).default([]),
  medieval: z.array(z.string()).default([]),
  variants: z.array(z.string()).default([]),
  coords: z.tuple([z.number(), z.number()]), // [lng, lat]
  pleiadesId: z.string().optional(),
  essaySlugs: z.array(z.string()).default([]),
  mapIds: z.array(z.string()).default([]),
});

export type Toponym = z.infer<typeof ToponymSchema>;

const RAW: unknown[] = [
  {
    id: 'babylon',
    modern: 'Hillah (Babylon)',
    ancient: ['Babylon', 'Bābilim'],
    variants: ['Bābil'],
    coords: [44.42, 32.54],
    mapIds: ['babylonian'],
    essaySlugs: ['cartography'],
  },
  {
    id: 'alexandria',
    modern: 'Alexandria',
    ancient: ['Alexandria ad Aegyptum', 'Rhakotis'],
    variants: ['al-Iskandariyya'],
    coords: [29.92, 31.2],
    pleiadesId: '727070',
    mapIds: ['eratosthenes', 'ptolemy'],
    essaySlugs: ['cartography', 'speculum'],
  },
  {
    id: 'jerusalem',
    modern: 'Jerusalem',
    ancient: ['Hierosolyma', 'Aelia Capitolina'],
    medieval: ['Jerusalem'],
    variants: ['Yerushalayim', 'al-Quds'],
    coords: [35.23, 31.78],
    mapIds: ['hereford'],
    essaySlugs: ['cartography'],
  },
  {
    id: 'rome',
    modern: 'Rome',
    ancient: ['Roma'],
    variants: ['Caput Mundi'],
    coords: [12.49, 41.9],
    pleiadesId: '423025',
    mapIds: ['peutinger'],
    essaySlugs: ['dacia'],
  },
  {
    id: 'constantinople',
    modern: 'Istanbul',
    ancient: ['Byzantion', 'Byzantium'],
    medieval: ['Constantinople', 'Miklagard'],
    variants: ['Konstantiniyye', 'Nova Roma'],
    coords: [28.98, 41.01],
    essaySlugs: ['speculum', 'venice-sicily'],
  },
  {
    id: 'palermo',
    modern: 'Palermo',
    ancient: ['Panormus'],
    medieval: ['Balarm'],
    variants: ['Palermu'],
    coords: [13.36, 38.12],
    mapIds: ['idrisi'],
    essaySlugs: ['venice-sicily'],
  },
  {
    id: 'venice',
    modern: 'Venice',
    medieval: ['Venetiae', 'Venexia'],
    variants: ['Venezia'],
    coords: [12.34, 45.44],
    mapIds: ['fra-mauro'],
    essaySlugs: ['venice-sicily'],
  },
  {
    id: 'sarmizegetusa',
    modern: 'Grădiștea de Munte',
    ancient: ['Sarmizegetusa Regia', 'Ulpia Traiana Sarmizegetusa'],
    coords: [23.31, 45.62],
    essaySlugs: ['dacia'],
  },
  {
    id: 'napoca',
    modern: 'Cluj-Napoca',
    ancient: ['Napoca'],
    medieval: ['Kolozsvár', 'Clus'],
    variants: ['Klausenburg'],
    coords: [23.6, 46.77],
    essaySlugs: ['dacia'],
  },
  {
    id: 'londinium',
    modern: 'London',
    ancient: ['Londinium'],
    medieval: ['Lundenwic'],
    coords: [-0.13, 51.51],
    mapIds: ['hereford'],
    essaySlugs: ['cartography'],
  },
  {
    id: 'carthage',
    modern: 'Tunis (Carthage)',
    ancient: ['Carthago', 'Qart-ḥadasht'],
    variants: ['Carthage'],
    coords: [10.32, 36.85],
    essaySlugs: ['cartography', 'speculum'],
  },
];

// Validated at module load so a malformed record fails the build, not the browser.
export const TOPONYMS: Toponym[] = RAW.map((t) => ToponymSchema.parse(t));

export function getToponyms(): Toponym[] {
  return [...TOPONYMS].sort((a, b) => a.modern.localeCompare(b.modern));
}

/** Every name a place is known by — modern first, then historical + variants. */
export function toponymNames(t: Toponym): string[] {
  return [t.modern, ...t.ancient, ...t.medieval, ...t.variants];
}
