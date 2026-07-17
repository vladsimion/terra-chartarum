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
  /** One-line domain summary (used on the rooms overview grid and in metadata). */
  blurb: string;
  /**
   * The room's curatorial lede (TC-203 / KAN-98): a 100–150 word paragraph, in
   * site voice, that states the question the room asks of the world. Rendered as
   * the opening prose on /rooms/[slug]/.
   */
  lede: string;
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
    lede: 'Before any line is drawn, there is ground — rivers that will not hold still, coastlines that erode faster than they can be surveyed, a climate that redraws the habitable world with every century. The Earth asks the question every map must answer first: what is actually there, before we choose what to keep? This room gathers the world as terrain rather than territory — geology, landscape, and ecology as the stubborn substrate that cartography simplifies, flattens, and inevitably betrays. To map the Earth is to trade its living, four-dimensional depth for a legible surface; here we linger on what that surface leaves out. Every elevation smoothed, every wetland reduced to a symbol, every season averaged away is a small erasure — and the ground remembers what the map forgets.',
    glyph: '/rooms/glyphs/earth.svg',
  },
  {
    slug: 'map',
    title: 'The Map',
    order: 2,
    blurb: 'Cartography, projection, and navigation — the craft and argument of the map itself.',
    lede: 'This is the room where the map turns to look at itself. Projection, scale, symbol, and survey are not neutral techniques but arguments — each a claim about which distortions are worth accepting so that others can disappear. The Map asks: what does every gain in accuracy, usability, or control quietly cost somewhere else? Read against the grain, eight thousand years of world-mapping become a ledger of such sacrifices — the sphere flattened, the coastline generalised, the unknown filled with confident ornament. Here the craft is inseparable from its politics: to measure is already to decide what counts as worth measuring. We treat the map not as a window onto the world but as a made thing, with a maker, a method, and a motive — and we ask what each of those leaves in shadow.',
    glyph: '/rooms/glyphs/map.svg',
  },
  {
    slug: 'city',
    title: 'The City',
    order: 3,
    blurb: 'Civilisation, urbanism, and architecture — space made dense and dwelt in.',
    lede: 'When the world is not merely crossed but inhabited, mapping changes its nature. The City is the room of dense, dwelt-in space — the plan, the cadastre, the street named and taxed and zoned. It asks how a place becomes property: how the loose, negotiated ground of everyday life is fixed into parcels, addresses, and jurisdictions that can be owned, sold, and governed. To map a city is to impose a grid on a living settlement, and every grid decides who is legible to power and who slips between its lines. Here we watch civilisation draw itself — walls, blocks, and boundaries as instruments of order and exclusion alike. The urban map promises to make the crowded world knowable; we ask whose knowledge it serves, and whose dwelling it renders invisible in the process.',
    glyph: '/rooms/glyphs/city.svg',
  },
  {
    slug: 'border',
    title: 'The Border',
    order: 4,
    blurb: 'Politics, empire, and identity — the lines that claim, divide, and define.',
    lede: 'A border is the most consequential line a map can draw — an abstraction that becomes fact, dividing kin from kin and turning ground into territory. This room asks what such lines do to the people they claim: how empire, nation, and identity are conjured and enforced through cartography, and how nineteen centuries of mapping a place like Dacia can bury as much as they record. The Border treats maps as instruments of possession — the survey that precedes annexation, the frontier that hardens into ideology, the name that erases an older name. Beneath every confident boundary lies a stratified silence: the claims overwritten, the peoples unmapped, the alternatives foreclosed. We read these lines not as neutral descriptions of where one thing ends and another begins, but as arguments about who belongs, who rules, and who is written out.',
    glyph: '/rooms/glyphs/border.svg',
  },
  {
    slug: 'road',
    title: 'The Road',
    order: 5,
    blurb: 'Travel, trade, and exploration — the world experienced as movement and route.',
    lede: 'Some maps are not drawn from above but travelled from within — the world known as a sequence of passages, ports, and stages rather than a territory surveyed whole. The Road is the room of movement: trade routes, itineraries, and voyages of exploration, space experienced as the distance between one place and the next. It asks how the world looks to those who cross it — how a merchant\u2019s sea of connected harbours differs from a state\u2019s administered land, two rival ideologies of space meeting on the same water. To map the route is to privilege the line of travel over the ground it passes, the network over the territory. Here we follow the map that serves the journey — and ask what it must ignore about everything that lies to either side of the road.',
    glyph: '/rooms/glyphs/road.svg',
  },
  {
    slug: 'archive',
    title: 'The Archive',
    order: 6,
    blurb: 'History, memory, and archaeology — maps as artefacts and the silences they keep.',
    lede: 'Every map eventually stops describing the world and starts describing the moment that made it. The Archive is the room where cartography becomes artefact — the old sheet read not for its accuracy but for its assumptions, its omissions, the vanished certainties it preserves in ink. It asks what a map becomes once it is old: a record, a relic, a piece of evidence to be excavated like any other stratum. Here mapping meets history and archaeology, and the silences matter as much as the marks — the territories left blank, the peoples uncounted, the knowledge that never made it onto the page. To read the archive against the grain is to treat absence as data. We ask not only what these maps once claimed to show, but what they were built, quietly, to keep from view.',
    glyph: '/rooms/glyphs/archive.svg',
  },
  {
    slug: 'theatre',
    title: 'The Theatre',
    order: 7,
    blurb: 'Philosophy, knowledge, and abstraction — mapping as a way of staging the world.',
    lede: 'Named for Ortelius\u2019s Theatrum Orbis Terrarum, this is the room where the map stops pretending to be the world and admits that it stages one. The Theatre gathers cartography as philosophy — mapping as a way of thinking, a theatre in which knowledge itself is set out for viewing, arranged and lit and framed. It asks what it means to abstract the world into a system: to plot fifteen centuries of maps not on a timeline of progress but as coordinates in a space of values, or to build an essay whose every component stages an argument about a map rather than reproducing one. Here the map is openly a performance of knowledge, with all a performance\u2019s selection and artifice. We ask what is gained when the world is made into a spectacle to be understood — and what such staging quietly leaves in the wings.',
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
