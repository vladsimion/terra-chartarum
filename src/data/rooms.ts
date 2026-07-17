// The seven-room cosmography (TC-101 / KAN-92).
//
// Terra Chartarum is organised as a medieval-style cosmography of seven rooms.
// This module is the SINGLE SOURCE OF TRUTH for that taxonomy: the content
// schema (KAN-93) derives its zod enum from ROOM_SLUGS, the navigation pages and
// cross-linking components (RoomBadge / RoomPath / RelatedByRoom / RoomIndex)
// read ROOMS, and search emits the slug as a facet keyword. Nothing else should
// hard-code a room slug or title.
//
// Naming note (charter decision D3): Room 7 is "The Theatre" — a nod to
// Ortelius's Theatrum Orbis Terrarum — deliberately NOT "The Atlas", to avoid a
// permanent namespace clash with the existing Atlas (GIS) page.

export interface Room {
  /** URL-safe identifier, used in /rooms/[slug]/ and as the schema enum value. */
  slug: string;
  /** Display name, e.g. "The Earth". */
  title: string;
  /** Cosmography order, 1–7; drives prev/next reading paths and the grid. */
  order: number;
  /** One-line domain summary (the long curatorial lede lives on the room page). */
  blurb: string;
  /**
   * Path to the room's glyph SVG (cover-SVG style). The assets themselves are
   * produced under KAN-101; this is the reference every consumer resolves.
   */
  glyph: string;
}

export const ROOMS: readonly Room[] = [
  {
    slug: 'earth',
    title: 'The Earth',
    order: 1,
    blurb: 'Geography, landscape, and ecology — the world as ground before it is drawn.',
    glyph: '/rooms/glyphs/earth.svg',
  },
  {
    slug: 'map',
    title: 'The Map',
    order: 2,
    blurb: 'Cartography, projection, and navigation — the craft and argument of the map itself.',
    glyph: '/rooms/glyphs/map.svg',
  },
  {
    slug: 'city',
    title: 'The City',
    order: 3,
    blurb: 'Civilisation, urbanism, and architecture — space made dense and dwelt in.',
    glyph: '/rooms/glyphs/city.svg',
  },
  {
    slug: 'border',
    title: 'The Border',
    order: 4,
    blurb: 'Politics, empire, and identity — the lines that claim, divide, and define.',
    glyph: '/rooms/glyphs/border.svg',
  },
  {
    slug: 'road',
    title: 'The Road',
    order: 5,
    blurb: 'Travel, trade, and exploration — the world experienced as movement and route.',
    glyph: '/rooms/glyphs/road.svg',
  },
  {
    slug: 'archive',
    title: 'The Archive',
    order: 6,
    blurb: 'History, memory, and archaeology — maps as artefacts and the silences they keep.',
    glyph: '/rooms/glyphs/archive.svg',
  },
  {
    slug: 'theatre',
    title: 'The Theatre',
    order: 7,
    blurb: 'Philosophy, knowledge, and abstraction — mapping as a way of staging the world.',
    glyph: '/rooms/glyphs/theatre.svg',
  },
] as const;

/** A room slug, narrowed to the seven canonical values. */
export type RoomSlug = (typeof ROOMS)[number]['slug'];

/**
 * Room slugs as a non-empty literal tuple, for reuse as a zod enum in the
 * content schema (KAN-93). z.enum() requires a `[U, ...U[]]` tuple (non-empty,
 * non-readonly), which a plain `readonly string[]` does not satisfy, so we
 * assert the tuple shape here. Kept in declaration (cosmography) order.
 */
export const ROOM_SLUGS = ROOMS.map((r) => r.slug) as [RoomSlug, ...RoomSlug[]];

const ROOM_BY_SLUG = new Map(ROOMS.map((r) => [r.slug, r]));

/** Look up a room by slug, or undefined if the slug is not one of the seven. */
export function getRoom(slug: string): Room | undefined {
  return ROOM_BY_SLUG.get(slug);
}
