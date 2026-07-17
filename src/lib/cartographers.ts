/**
 * Cartographer registry (ATLAS-901 / KAN-71)
 *
 * A typed, Zod-validated list of the people behind the corpus maps. Records are
 * linked from `HistoricalMap.cartographerId`, powering the /cartographers pages
 * and the cartographer link on each map detail page.
 *
 * Years are signed (negative = BC), matching the corpus convention. Validated at
 * module load so a malformed entry fails the build, not the browser.
 */
import { z } from 'astro:content';
import { ROOM_SLUGS } from '../data/rooms';
import { getCorpus } from './corpus';
import type { HistoricalMap } from './corpus';

export const CartographerLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
});

export const CartographerSchema = z.object({
  id: z.string(),
  name: z.string(),
  sortName: z.string(),
  born: z.number().optional(),
  died: z.number().optional(),
  places: z.array(z.string()).default([]),
  bio: z.string(),
  essaySlugs: z.array(z.string()).default([]),
  links: z.array(CartographerLinkSchema).default([]),
  portrait: z.string().optional(),
  // Seven-room cosmography (TC-102 / KAN-93). Optional here so existing records
  // validate unchanged; retro-tagging lands in KAN-94.
  room: z.enum(ROOM_SLUGS).optional(),
  secondaryRooms: z.array(z.enum(ROOM_SLUGS)).max(2).default([]),
  roomAnchor: z.boolean().default(false),
});

export type Cartographer = z.infer<typeof CartographerSchema>;

const RAW: unknown[] = [
  {
    id: 'mercator',
    room: 'map',
    name: 'Gerardus Mercator',
    sortName: 'Mercator, Gerardus',
    born: 1512,
    died: 1594,
    places: ['Rupelmonde', 'Leuven', 'Duisburg'],
    bio: 'Flemish cartographer, engraver and instrument-maker whose 1569 projection made rhumb lines straight for navigators — at the cost of grossly inflating the high latitudes. He coined the term "atlas" for a bound collection of maps.',
    essaySlugs: ['cartography'],
    links: [{ label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Gerardus_Mercator' }],
  },
  {
    id: 'ortelius',
    room: 'theatre',
    secondaryRooms: ['map'],
    name: 'Abraham Ortelius',
    sortName: 'Ortelius, Abraham',
    born: 1527,
    died: 1598,
    places: ['Antwerp'],
    bio: 'Brabantian cartographer and geographer whose Theatrum Orbis Terrarum (1570) is regarded as the first modern atlas: a uniform, bound set of map sheets with a credited list of sources.',
    essaySlugs: ['speculum'],
    links: [{ label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Abraham_Ortelius' }],
  },
  {
    id: 'waldseemuller',
    room: 'theatre',
    secondaryRooms: ['map'],
    name: 'Martin Waldseemüller',
    sortName: 'Waldseemüller, Martin',
    born: 1470,
    died: 1520,
    places: ['Saint-Dié-des-Vosges'],
    bio: 'German cartographer whose 1507 world map was the first to apply the name "America" to the New World, honouring Amerigo Vespucci.',
    essaySlugs: ['speculum'],
    links: [{ label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Martin_Waldseem%C3%BCller' }],
  },
  {
    id: 'al-idrisi',
    room: 'road',
    name: 'Muhammad al-Idrisi',
    sortName: 'Idrisi, Muhammad al-',
    born: 1100,
    died: 1165,
    places: ['Ceuta', 'Palermo'],
    bio: 'Arab geographer at the Norman court of Roger II of Sicily, where he compiled the Tabula Rogeriana (1154) — one of the most advanced world maps of the medieval period, drawn south-up.',
    essaySlugs: ['venice-sicily'],
    links: [{ label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Muhammad_al-Idrisi' }],
  },
  {
    id: 'cassini',
    room: 'map',
    secondaryRooms: ['border'],
    name: 'César-François Cassini de Thury',
    sortName: 'Cassini de Thury, César-François',
    born: 1714,
    died: 1784,
    places: ['Paris'],
    bio: 'French astronomer and cartographer (Cassini III) who directed the triangulation-based Carte de Cassini, the first topographic map of an entire nation grounded in systematic geodetic survey.',
    essaySlugs: ['cartography'],
    links: [
      {
        label: 'Wikipedia',
        url: 'https://en.wikipedia.org/wiki/C%C3%A9sar-Fran%C3%A7ois_Cassini_de_Thury',
      },
    ],
  },
  {
    id: 'honterus',
    room: 'border',
    name: 'Johannes Honterus',
    sortName: 'Honterus, Johannes',
    born: 1498,
    died: 1549,
    places: ['Kronstadt (Brașov)'],
    bio: 'Transylvanian Saxon humanist, cosmographer and reformer who mapped his own Carpathian homeland and produced widely reprinted cosmographic works.',
    essaySlugs: ['dacia'],
    links: [{ label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Johannes_Honterus' }],
  },
];

export const CARTOGRAPHERS: Cartographer[] = RAW.map((c) => CartographerSchema.parse(c));

export function getCartographers(): Cartographer[] {
  return [...CARTOGRAPHERS].sort((a, b) => a.sortName.localeCompare(b.sortName));
}

export function getCartographerById(id: string): Cartographer | undefined {
  return CARTOGRAPHERS.find((c) => c.id === id);
}

export function mapsByCartographer(id: string): HistoricalMap[] {
  return getCorpus().filter((m) => m.cartographerId === id);
}
