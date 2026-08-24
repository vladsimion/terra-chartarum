/**
 * GeoLayer registry (ATLAS-EG2)
 *
 * Typed, Zod-validated manifest of historical-GIS layers for the atlas map.
 * Mirrors the essay registry. Regime A (serverless, cloud-native): layers are
 * static, cloud-native formats (PMTiles / COG / FlatGeobuf / GeoJSON) served
 * from a CDN and versioned with the repo - no database. Escalation to Regime B
 * (PostGIS + Martin/TiTiler) is deferred until a spatial-query/scale trigger.
 *
 * The full tile-rendering pipeline (attaching the pmtiles protocol, adding COG
 * raster sources) lands in ATLAS-EG3; this module defines and validates the
 * layers the map will consume, and drives the layer-toggle UI.
 */
import { z } from 'astro:content';
import { ROOM_SLUGS } from '../data/rooms';

/**
 * Layer taxonomy (ATLAS-1201 / KAN-397).
 *
 * These four vocabularies are the SINGLE SOURCE OF TRUTH for how the Atlas
 * classifies, groups, searches and governs layers. They exist so the catalogue
 * never has to infer semantics from a display title or from which essay happens
 * to own a layer.
 *
 * `role` answers "what kind of claim does this layer make?":
 *   - `context`      neutral framing geography; makes no historical claim.
 *   - `historical`   a reconstructed past state - the scholarly payload.
 *   - `evidence`     what a source depicts or covers, not what was there.
 *   - `map-overlay`  a georeferenced historical map surface.
 *
 * `category` is the canonical thematic grouping the browser renders. It is
 * deliberately closed: a new theme is a vocabulary decision, not a per-layer
 * free-text choice. `subcategory` carries narrower editorial grouping and stays
 * open, so a programme can distinguish its own families without lobbying for a
 * new global category.
 */
export const GEO_LAYER_ROLES = ['context', 'historical', 'evidence', 'map-overlay'] as const;
export type GeoLayerRole = (typeof GEO_LAYER_ROLES)[number];

export const GEO_LAYER_CATEGORIES = [
  'territories-boundaries',
  'networks-circulation',
  'places-settlements',
  'names-peoples-attestations',
  'conflict-campaigns-frontiers',
  'cartographic-evidence',
  'historical-map-overlays',
] as const;
export type GeoLayerCategory = (typeof GEO_LAYER_CATEGORIES)[number];

/**
 * Editorial publication state. This is a statement about the scholarship, NOT
 * about whether the binary exists: a layer can be `published` while its asset is
 * still empty (dacia-attestations ships its contract ahead of the human review
 * that will fill it), and asset presence is decided at render time by the
 * release manifest. Conflating the two is what ATLAS-1208 has to unpick.
 */
export const GEO_LAYER_LIFECYCLES = [
  'published',
  'in-review',
  'in-preparation',
  'planned',
] as const;
export type GeoLayerLifecycle = (typeof GEO_LAYER_LIFECYCLES)[number];

/** Roles that make a historical/evidential claim and therefore need a category. */
const CATEGORISED_ROLES: readonly GeoLayerRole[] = ['historical', 'evidence', 'map-overlay'];

const BaseGeoLayerSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  // Taxonomy (KAN-397). `role` is required on every entry: the catalogue must
  // never have to guess whether a line is a frontier or a coastline.
  role: z.enum(GEO_LAYER_ROLES),
  category: z.enum(GEO_LAYER_CATEGORIES).optional(),
  subcategory: z.string().optional(),
  /**
   * Justification for a `map-overlay` that is filed outside
   * `historical-map-overlays`. Without it the cross-field check rejects the
   * layer, so the exception is always argued rather than assumed.
   */
  categoryException: z.string().min(1).optional(),
  /**
   * Many-to-many references into the collection registry (ATLAS-1202). Whether a
   * layer is default-on is deliberately NOT recorded here: that is a property of
   * a collection, not of a layer, so it lives with the collection.
   */
  collectionIds: z.array(z.string()).default([]),
  /** Search/discovery synonyms and concepts. Authored without touching `title`. */
  tags: z.array(z.string()).default([]),
  /** Controlled editorial prominence in the catalogue. */
  featured: z.boolean().default(false),
  /** Deterministic catalogue order; lower sorts first, ties break on `id`. */
  sortWeight: z.number().default(0),
  lifecycle: z.enum(GEO_LAYER_LIFECYCLES).default('published'),
  kind: z.enum(['vector', 'raster', 'georef-scan']),
  format: z.enum(['pmtiles', 'cog', 'flatgeobuf', 'geojson']),
  url: z.string(),
  crs: z.string().default('EPSG:4326'),
  yearFrom: z.number(),
  yearTo: z.number(),
  source: z.string(),
  license: z.string(),
  attribution: z.string(),
  documentationLinks: z.array(z.object({ label: z.string(), href: z.string().url() })).default([]),
  gazetteerIds: z.array(z.string()).optional(),
  essaySlugs: z.array(z.string()).optional(),
  essayLinks: z
    .array(
      z.object({
        slug: z.string(),
        sectionId: z.string(),
        label: z.string(),
      }),
    )
    .default([]),
  defaultOn: z.boolean().default(false),
  // Render hints consumed by the MapLibre pipeline (ATLAS-EG3; extended VMN-20).
  // `circle` = graduated point symbols (ports); see `graduate` below.
  geometry: z.enum(['line', 'fill', 'circle']).default('line'),
  color: z.string().default('#d4b87a'),
  // Vector-tile source layer (PMTiles); ignored for geojson.
  sourceLayer: z.string().optional(),
  // Per-feature temporal reveal (VMN-2 blocker B2 / decision D2). When true the
  // time-slider filters individual features by their inclusive valid_from/valid_to
  // (9999 = open-ended) rather than toggling the whole layer by the envelope above.
  perFeatureTime: z.boolean().default(false),
  // Graduated point symbols keyed on a categorical feature field (VMN-20 / B3):
  // circle-radius by value, e.g. ports sized by `status`.
  graduate: z
    .object({
      field: z.string(),
      radius: z.record(z.string(), z.number()),
      fallback: z.number().default(4),
    })
    .optional(),
  // Data-driven dashed lines (VMN-20 / B3): one filtered sub-layer per field value,
  // e.g. routes dashed by `route_type`. An empty pattern renders solid.
  dash: z
    .object({
      field: z.string(),
      patterns: z.record(z.string(), z.array(z.number())),
    })
    .optional(),
  // Data-driven line width keyed on a categorical field (KAN-310), e.g. HSE
  // corridors widened by `evidence_type`. Combines with `dash` so evidence
  // strength and uncertainty are legible independently of colour.
  width: z
    .object({
      field: z.string(),
      widths: z.record(z.string(), z.number()),
      fallback: z.number().default(1.2),
    })
    .optional(),
  // Feature properties the layer declares as filterable (KAN-340). Declaring
  // them on the layer rather than hard-coding them in the map island means a
  // new corpus layer arrives with its own facets instead of a UI change.
  facets: z.array(z.string()).default([]),
  // Seven-room cosmography (TC-102 / KAN-93). Optional here so existing layers
  // validate unchanged; retro-tagging lands in KAN-94.
  room: z.enum(ROOM_SLUGS).optional(),
  secondaryRooms: z.array(z.enum(ROOM_SLUGS)).max(2).default([]),
  roomAnchor: z.boolean().default(false),
});

/**
 * Cross-field taxonomy rules (KAN-397 step 3). Kept as a refinement rather than
 * a union so the inferred type stays one flat `GeoLayer` for every consumer.
 */
export const GeoLayerSchema = BaseGeoLayerSchema.superRefine((layer, ctx) => {
  if (CATEGORISED_ROLES.includes(layer.role) && !layer.category) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['category'],
      message: `Layer "${layer.id}" has role "${layer.role}" and must declare a canonical category`,
    });
  }

  // A context layer states no historical thesis, so it may not borrow a
  // historical category - that is what would let modern national boundaries pass
  // themselves off as historical evidence. Narrower grouping goes in
  // `subcategory` instead (e.g. `physical-geography`, `modern-reference`).
  if (layer.role === 'context' && layer.category) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['category'],
      message: `Context layer "${layer.id}" must not declare a historical category (use subcategory)`,
    });
  }

  if (
    layer.role === 'map-overlay' &&
    layer.category &&
    layer.category !== 'historical-map-overlays' &&
    !layer.categoryException
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['category'],
      message: `Map overlay "${layer.id}" must use historical-map-overlays or declare a categoryException`,
    });
  }

  if (layer.categoryException && layer.role !== 'map-overlay') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['categoryException'],
      message: `Layer "${layer.id}" declares a categoryException but is not a map overlay`,
    });
  }
});

export type GeoLayer = z.infer<typeof GeoLayerSchema>;

// Layers. The Natural Earth base layers and the AWMC Roman Empire extent are real
// GeoJSON assets served from /public/geo and rendered live by the MapLibre pipeline
// (ATLAS-EG3). The remaining essay-linked historical layer (venetian-maritime-1400)
// is registered with its metadata but ships no binary yet - producing it needs
// tippecanoe/GDAL tooling and sourced data (ATLAS-EG3 remainder / EG6). The atlas
// enables a toggle only when its asset is actually present, so a layer goes live
// the moment its file is dropped in.
// Validated at module load so a malformed entry fails the build, not the browser.
const RAW: unknown[] = [
  {
    id: 'ne-coastline',
    role: 'context',
    subcategory: 'physical-geography',
    tags: ['coastline', 'shoreline', 'base map', 'physical geography', 'natural earth'],
    sortWeight: 10,
    room: 'earth',
    title: 'Natural Earth - Coastline',
    description: 'Small-scale physical coastline, a neutral base for historical overlays.',
    kind: 'vector',
    format: 'geojson',
    url: '/geo/ne_110m_coastline.geojson',
    yearFrom: -6000,
    yearTo: 2024,
    source: 'Natural Earth',
    license: 'Public Domain',
    attribution: 'Made with Natural Earth',
    geometry: 'line',
    color: '#7fa8c9',
    defaultOn: true,
  },
  {
    id: 'ne-land',
    role: 'context',
    subcategory: 'physical-geography',
    tags: ['landmass', 'land outline', 'base map', 'physical geography', 'natural earth'],
    sortWeight: 20,
    room: 'earth',
    title: 'Natural Earth - Land outline',
    description: 'Coastal landmass outlines - a subtle physical frame for the corpus.',
    kind: 'vector',
    format: 'geojson',
    url: '/geo/ne_110m_land.geojson',
    yearFrom: -6000,
    yearTo: 2024,
    source: 'Natural Earth',
    license: 'Public Domain',
    attribution: 'Made with Natural Earth',
    geometry: 'line',
    color: '#5c5340',
    defaultOn: false,
  },
  {
    id: 'ne-rivers',
    role: 'context',
    subcategory: 'physical-geography',
    tags: [
      'rivers',
      'lakes',
      'waterways',
      'inland navigation',
      'physical geography',
      'natural earth',
    ],
    sortWeight: 30,
    room: 'earth',
    secondaryRooms: ['road'],
    title: 'Natural Earth - Rivers',
    description: 'Major river and lake centrelines - waterways that carried maps and trade.',
    kind: 'vector',
    format: 'geojson',
    url: '/geo/ne_110m_rivers_lake_centerlines.geojson',
    yearFrom: -6000,
    yearTo: 2024,
    source: 'Natural Earth',
    license: 'Public Domain',
    attribution: 'Made with Natural Earth',
    geometry: 'line',
    color: '#4f7d8c',
    defaultOn: false,
  },
  {
    id: 'ne-boundaries',
    // Classified `context`, never `historical`: these are present-day lines used as a
    // reading grid. The UI must keep labelling them anachronistic (KAN-402).
    role: 'context',
    subcategory: 'modern-reference',
    tags: [
      'modern borders',
      'national boundaries',
      'present-day',
      'anachronism',
      'reference grid',
      'natural earth',
    ],
    sortWeight: 40,
    room: 'border',
    title: 'Modern national boundaries',
    description: 'Present-day land borders - an anachronistic reference grid over historical maps.',
    kind: 'vector',
    format: 'geojson',
    url: '/geo/ne_110m_admin_0_boundary_lines_land.geojson',
    yearFrom: 1949,
    yearTo: 2024,
    source: 'Natural Earth',
    license: 'Public Domain',
    attribution: 'Made with Natural Earth',
    geometry: 'line',
    color: '#8a6d4a',
    defaultOn: false,
  },
  {
    id: 'map-coverage',
    // `evidence`, not `historical`: a footprint records what a map depicts, which is
    // a claim about the source rather than about the ground.
    role: 'evidence',
    category: 'cartographic-evidence',
    subcategory: 'depicted-extent',
    tags: [
      'coverage',
      'depicted extent',
      'footprint',
      'corpus',
      'map sheets',
      'what the map shows',
    ],
    featured: true,
    sortWeight: 100,
    room: 'map',
    title: 'Depicted extents (corpus)',
    description:
      'The area each corpus map depicts - one footprint polygon per map, keyed by mapId.',
    kind: 'vector',
    format: 'geojson',
    url: '/geo/coverage.geojson',
    yearFrom: -600,
    yearTo: 1972,
    source: 'Terra Chartarum (authored)',
    license: 'CC BY',
    attribution: 'Terra Chartarum',
    geometry: 'fill',
    color: '#d4b87a',
    defaultOn: false,
  },
  {
    id: 'roman-empire-117',
    role: 'historical',
    category: 'territories-boundaries',
    subcategory: 'imperial-extent',
    tags: ['rome', 'roman empire', 'trajan', 'provinces', 'antiquity', 'imperial extent'],
    featured: true,
    sortWeight: 200,
    room: 'border',
    secondaryRooms: ['archive'],
    title: 'Roman Empire, AD 117',
    description: "Imperial extent at Trajan's greatest reach - context for the Dacia essay.",
    kind: 'vector',
    format: 'geojson',
    url: '/geo/roman-empire-117.geojson',
    yearFrom: 106,
    yearTo: 271,
    source: 'Ancient World Mapping Center (AWMC), UNC Chapel Hill - roman_empire_ce_117_extent',
    license: 'ODbL 1.0',
    attribution:
      'Ancient World Mapping Center; derived from the Barrington Atlas and OpenStreetMap (ODbL)',
    essaySlugs: ['dacia'],
    geometry: 'fill',
    color: '#d98860',
    defaultOn: false,
  },
  // Venetian Maritime Network, c.1400 (VMN). Three per-geometry FGB layers per the
  // frozen data dictionary (VMN-3, authority-table model): ports graduated by
  // status, routes dashed by route_type, possessions as phased fills. The compilation
  // pipeline produces and validates all three binaries; AtlasMap lazily decodes them.
  {
    id: 'venetian-ports',
    role: 'historical',
    category: 'places-settlements',
    subcategory: 'ports-and-harbours',
    tags: ['venice', 'stato da mar', 'ports', 'harbours', 'colonies', 'mediterranean', 'maritime'],
    sortWeight: 300,
    room: 'road',
    secondaryRooms: ['border'],
    title: 'Venetian maritime ports, c.1200–1500',
    description:
      'Stato da màr nodes - the metropole and its capital, subject cities, colonies and independent rivals - graduated by status, each phase a separate feature.',
    kind: 'vector',
    format: 'flatgeobuf',
    url: '/geo/venetian-ports.fgb',
    yearFrom: 1200,
    yearTo: 1500,
    source: "Terra Chartarum (compiled) - Lane 1973; O'Connell 2009",
    license: 'CC BY',
    attribution: "Terra Chartarum; after Lane and O'Connell",
    documentationLinks: [
      {
        label: 'Data dictionary',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/vmn/data-dictionary.md',
      },
      {
        label: 'Source log',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/vmn/source-log.md',
      },
      {
        label: 'Deep-link guide',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/vmn/deep-links.md',
      },
    ],
    essaySlugs: ['venice-sicily'],
    essayLinks: [
      {
        slug: 'venice-sicily',
        sectionId: 'rotta',
        label: 'The route, harbour by harbour',
      },
    ],
    geometry: 'circle',
    color: '#e2a93f',
    perFeatureTime: true,
    graduate: {
      field: 'status',
      radius: {
        metropole: 9,
        capital: 8,
        colony: 7,
        protectorate: 6,
        subject: 5,
        independent: 5,
        metropolitan_quarter: 6,
        commercial_quarter: 5,
        rival_genoese: 5,
        leased: 4,
        feudatory: 4,
        contested: 4,
        foreign_port: 4,
        trading_post: 4,
        crusader_port: 4,
        staging: 3,
        lost: 3,
      },
      fallback: 4,
    },
    defaultOn: false,
  },
  {
    id: 'venetian-routes',
    role: 'historical',
    category: 'networks-circulation',
    subcategory: 'maritime-routes',
    tags: ['venice', 'muda', 'galley', 'convoy', 'trade routes', 'mediterranean', 'maritime'],
    featured: true,
    sortWeight: 310,
    room: 'road',
    secondaryRooms: ['border'],
    title: 'Venetian galley routes (mude), c.1200–1500',
    description:
      'The documented muda convoy lines and private round-ship trades, dashed by route_type and routed through their staging ports.',
    kind: 'vector',
    format: 'flatgeobuf',
    url: '/geo/venetian-routes.fgb',
    yearFrom: 1200,
    yearTo: 1500,
    source: 'Terra Chartarum (compiled) - Lane 1973',
    license: 'CC BY',
    attribution: 'Terra Chartarum; after Lane',
    documentationLinks: [
      {
        label: 'Data dictionary',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/vmn/data-dictionary.md',
      },
      {
        label: 'Source log',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/vmn/source-log.md',
      },
      {
        label: 'Deep-link guide',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/vmn/deep-links.md',
      },
    ],
    essaySlugs: ['venice-sicily'],
    essayLinks: [
      {
        slug: 'venice-sicily',
        sectionId: 'rotta',
        label: 'The route, harbour by harbour',
      },
    ],
    geometry: 'line',
    color: '#6db3c2',
    perFeatureTime: true,
    dash: {
      field: 'route_type',
      patterns: {
        muda: [],
        private: [2, 1.5],
      },
    },
    defaultOn: false,
  },
  {
    id: 'venetian-possessions',
    role: 'historical',
    category: 'territories-boundaries',
    subcategory: 'maritime-empire',
    tags: [
      'venice',
      'stato da mar',
      'possessions',
      'protectorates',
      'condominium',
      'mediterranean',
    ],
    sortWeight: 320,
    room: 'border',
    secondaryRooms: ['road'],
    title: 'Venetian possessions, c.1200–1500',
    description:
      'Territorial extent of the stato da màr - direct rule, protectorates, condominia and contested ground - as phased fills clipped to the coastline.',
    kind: 'vector',
    format: 'flatgeobuf',
    url: '/geo/venetian-possessions.fgb',
    yearFrom: 1200,
    yearTo: 1500,
    source: "Terra Chartarum (compiled) - Lane 1973; O'Connell 2009",
    license: 'CC BY',
    attribution: "Terra Chartarum; after Lane and O'Connell",
    documentationLinks: [
      {
        label: 'Data dictionary',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/vmn/data-dictionary.md',
      },
      {
        label: 'Source log',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/vmn/source-log.md',
      },
      {
        label: 'Deep-link guide',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/vmn/deep-links.md',
      },
    ],
    essaySlugs: ['venice-sicily'],
    essayLinks: [
      {
        slug: 'venice-sicily',
        sectionId: 'contrazione',
        label: 'The sea-state, drawn and undrawn',
      },
    ],
    geometry: 'fill',
    color: '#9c5b52',
    perFeatureTime: true,
    defaultOn: false,
  },
  {
    id: 'hanseatic-places',
    role: 'historical',
    category: 'places-settlements',
    subcategory: 'member-cities',
    tags: ['hansa', 'hanseatic league', 'kontor', 'cities', 'markets', 'baltic', 'north sea'],
    sortWeight: 400,
    room: 'road',
    secondaryRooms: ['city', 'archive'],
    title: 'Hanseatic places and participation phases',
    description:
      'Sixty source-linked city, market and Kontor phases with historical and modern names and explicit participation classes.',
    kind: 'vector',
    format: 'geojson',
    url: '/geo/hanseatic-places.geojson',
    yearFrom: 1295,
    yearTo: 1761,
    source: 'Terra Chartarum (compiled) - HSE gazetteer KAN-306/307',
    license: 'CC BY 4.0',
    attribution: 'Terra Chartarum; Marczinek, Maurer & Rauch; UNESCO; Henn; GeoNames',
    documentationLinks: [
      {
        label: 'Data dictionary',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/hanseatic/data-dictionary.md',
      },
      {
        label: 'Decisions',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/hanseatic/decisions.md',
      },
    ],
    essaySlugs: ['the-league-that-left-no-map'],
    essayLinks: [
      {
        slug: 'the-league-that-left-no-map',
        sectionId: 'city-is-unit',
        label: 'The city is the unit',
      },
    ],
    geometry: 'circle',
    color: '#7f9ca6',
    perFeatureTime: true,
    graduate: {
      field: 'role',
      radius: {
        leading_city: 8,
        active_city: 6.5,
        represented_city: 5.5,
        kontor: 7,
        foreign_branch: 5.5,
        associated_town: 4.5,
        market: 5,
      },
      fallback: 4,
    },
    defaultOn: false,
  },
  {
    id: 'hanseatic-routes',
    role: 'historical',
    category: 'networks-circulation',
    subcategory: 'trade-corridors',
    tags: ['hansa', 'hanseatic league', 'trade corridors', 'commodities', 'baltic', 'north sea'],
    featured: true,
    sortWeight: 410,
    room: 'road',
    secondaryRooms: ['city'],
    title: 'Hanseatic trade corridors',
    description:
      'Seven evidence-labelled maritime, riverine, overland and mixed corridors with normalized commodity joins.',
    kind: 'vector',
    format: 'geojson',
    url: '/geo/hanseatic-routes.geojson',
    yearFrom: 1356,
    yearTo: 1669,
    source: 'Terra Chartarum (compiled) - HSE network KAN-308',
    license: 'CC BY 4.0',
    attribution: 'Terra Chartarum; Wubs-Mrozewicz; UNESCO; Marczinek, Maurer & Rauch',
    documentationLinks: [
      {
        label: 'Data dictionary',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/hanseatic/data-dictionary.md',
      },
      {
        label: 'Decisions',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/hanseatic/decisions.md',
      },
    ],
    essaySlugs: ['the-league-that-left-no-map'],
    essayLinks: [
      {
        slug: 'the-league-that-left-no-map',
        sectionId: 'goods-draw-different-leagues',
        label: 'Goods draw different leagues',
      },
    ],
    geometry: 'line',
    color: '#7f9ca6',
    perFeatureTime: true,
    dash: {
      field: 'certainty',
      patterns: {
        high: [],
        medium: [4, 3],
        low: [2, 3],
      },
    },
    width: {
      field: 'evidence_type',
      widths: {
        documented_route: 3.2,
        repeated_commercial_connection: 2.2,
        generalized_reconstruction: 1.2,
      },
      fallback: 1.2,
    },
    defaultOn: false,
  },
  {
    id: 'hanseatic-events',
    // Filed under places rather than conflict: the events are overwhelmingly
    // institutional (privileges, Hansetage, Kontor rules) and they happen AT the
    // cities of hanseatic-places. `subcategory` keeps them separable in the
    // browser without inventing the territorial polygon the League never had.
    role: 'historical',
    category: 'places-settlements',
    subcategory: 'institutional-events',
    tags: [
      'hansa',
      'hanseatic league',
      'privileges',
      'hansetag',
      'embargo',
      'treaties',
      'institutions',
    ],
    sortWeight: 420,
    room: 'archive',
    secondaryRooms: ['road', 'city'],
    title: 'Hanseatic institutional events',
    description:
      'Privileges, ordinances, embargoes, conflict, treaties, Hansetage, Kontor closures and institutional afterlives.',
    kind: 'vector',
    format: 'geojson',
    url: '/geo/hanseatic-events.geojson',
    yearFrom: 1295,
    yearTo: 1764,
    source: 'Terra Chartarum (compiled) - HSE events KAN-308',
    license: 'CC BY 4.0',
    attribution: 'Terra Chartarum; UNESCO; Wubs-Mrozewicz; Henn; Lambert & Sicking',
    documentationLinks: [
      {
        label: 'Data dictionary',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/hanseatic/data-dictionary.md',
      },
      {
        label: 'Decisions',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/hanseatic/decisions.md',
      },
    ],
    essaySlugs: ['the-league-that-left-no-map'],
    essayLinks: [
      {
        slug: 'the-league-that-left-no-map',
        sectionId: 'power-without-sovereignty',
        label: 'Power without sovereignty',
      },
    ],
    geometry: 'circle',
    color: '#b98a58',
    perFeatureTime: true,
    graduate: {
      field: 'certainty',
      radius: { high: 7, medium: 5.5, low: 4 },
      fallback: 4,
    },
    defaultOn: false,
  },
  {
    id: 'dacia-attestations',
    // `published` although the asset is currently empty: lifecycle describes the
    // editorial contract, and asset availability is the release manifest's job.
    role: 'historical',
    category: 'names-peoples-attestations',
    subcategory: 'toponym-attestations',
    tags: ['dacia', 'toponyms', 'attestations', 'place names', 'corpus nominum daciae', 'reviewed'],
    sortWeight: 500,
    room: 'archive',
    secondaryRooms: ['map'],
    title: 'Dacia name attestations (reviewed)',
    description:
      'Where a source does or does not name a place in the Dacia corpus. This layer carries only records cleared by human review, and is empty until that review happens.',
    kind: 'vector',
    format: 'geojson',
    url: '/geo/dacia-attestations.geojson',
    yearFrom: 150,
    yearTo: 1959,
    source: 'Terra Chartarum (compiled) - Corpus Nominum Daciae 0.1, KAN-337',
    license: 'CC BY 4.0',
    attribution: 'Terra Chartarum; each source carries its own rights statement',
    documentationLinks: [
      {
        label: 'Data dictionary',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/dacia/data-dictionary.md',
      },
      {
        label: 'Programme',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/dacia/README.md',
      },
    ],
    essaySlugs: ['dacia'],
    geometry: 'circle',
    color: '#9e3b2b',
    perFeatureTime: true,
    facets: [
      'attestation_class',
      'confidence',
      'source_id',
      'source_family',
      'language',
      'script',
      'review_state',
    ],
    graduate: {
      field: 'confidence',
      radius: { direct: 7, high: 6.5, medium: 5.5, low: 4.5, editorial_reconstruction: 4 },
      fallback: 4,
    },
    defaultOn: false,
  },
  {
    // The research tier exists because CND 0.1 is a pilot release: it is the
    // whole point of the pilot that the records can be seen and argued with
    // before anyone has cleared them. Every feature carries its review_state,
    // and this layer is never on by default.
    id: 'dacia-attestations-research',
    // `in-review` states the plain fact that no record here has had a human pass;
    // the asset itself exists and ships.
    role: 'historical',
    category: 'names-peoples-attestations',
    subcategory: 'toponym-attestations',
    tags: [
      'dacia',
      'toponyms',
      'attestations',
      'place names',
      'corpus nominum daciae',
      'research tier',
      'unreviewed',
    ],
    sortWeight: 510,
    lifecycle: 'in-review',
    room: 'archive',
    secondaryRooms: ['map'],
    title: 'Dacia name attestations (research tier, unreviewed)',
    description:
      'The full CND 0.1 pilot: every compiled attestation including silences, none of it cleared by human review. Records here may not be cited as established evidence.',
    kind: 'vector',
    format: 'geojson',
    url: '/geo/dacia-attestations-research.geojson',
    yearFrom: 150,
    yearTo: 1959,
    source: 'Terra Chartarum (compiled) - Corpus Nominum Daciae 0.1 research tier, KAN-337',
    license: 'CC BY 4.0',
    attribution: 'Terra Chartarum; each source carries its own rights statement',
    documentationLinks: [
      {
        label: 'Data dictionary',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/dacia/data-dictionary.md',
      },
    ],
    essaySlugs: ['dacia'],
    geometry: 'circle',
    color: '#6f9e8a',
    perFeatureTime: true,
    facets: [
      'attestation_class',
      'confidence',
      'source_id',
      'source_family',
      'language',
      'script',
      'review_state',
    ],
    graduate: {
      field: 'confidence',
      radius: { direct: 7, high: 6.5, medium: 5.5, low: 4.5, editorial_reconstruction: 4 },
      fallback: 4,
    },
    defaultOn: false,
  },
  {
    // The Roman baseline ships as two layers because the Atlas takes one render
    // hint per layer, not because it is two datasets: both are compiled from
    // data/dacia/gis/roman-dacia.csv (KAN-341).
    id: 'dacia-roman-sites',
    role: 'historical',
    category: 'places-settlements',
    subcategory: 'roman-province',
    tags: ['dacia', 'roman', 'fortresses', 'road stations', 'mining', 'antiquity', 'sites'],
    sortWeight: 520,
    room: 'map',
    secondaryRooms: ['archive'],
    title: 'Roman Dacia · principal sites',
    description:
      "Legionary fortresses, road stations and mining centres of the province. Every point is the corpus's own reference location for that place, carrying the corpus's provenance: none is an excavated centroid.",
    kind: 'vector',
    format: 'geojson',
    url: '/geo/dacia-roman-sites.geojson',
    yearFrom: 106,
    yearTo: 271,
    source: 'Terra Chartarum (compiled) - Roman Dacia baseline, KAN-341',
    license: 'CC BY 4.0',
    attribution:
      'Terra Chartarum; positions from the Corpus Nominum Daciae; identifications after the Barrington Atlas and TIR L-34/L-35',
    documentationLinks: [
      {
        label: 'Shared GIS layers',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/dacia/shared-gis-layers.md',
      },
    ],
    essaySlugs: ['dacia'],
    geometry: 'circle',
    color: '#c08a3e',
    perFeatureTime: true,
    facets: ['feature_type', 'confidence', 'geometry_provenance', 'region', 'review_status'],
    graduate: {
      field: 'confidence',
      radius: { direct: 7, high: 6.5, medium: 5.5, low: 4.5, editorial_reconstruction: 4 },
      fallback: 4,
    },
    defaultOn: false,
  },
  {
    id: 'dacia-roman-network',
    // Roads and limes travel together in one asset, so the layer is filed by its
    // dominant claim - circulation - and the limes read through `subcategory`.
    role: 'historical',
    category: 'networks-circulation',
    subcategory: 'roads-and-frontier-corridors',
    tags: ['dacia', 'roman', 'roads', 'limes', 'frontier', 'antiquity', 'network'],
    sortWeight: 530,
    room: 'road',
    secondaryRooms: ['border', 'map'],
    title: 'Roman Dacia · roads and frontier corridors',
    description:
      'The province drawn as a network: roads are lines through attested stations, and the limes are corridors this project drew. Nothing here is digitised from a survey, and the dashes say which is which.',
    kind: 'vector',
    format: 'geojson',
    url: '/geo/dacia-roman-network.geojson',
    yearFrom: 106,
    yearTo: 271,
    source: 'Terra Chartarum (compiled) - Roman Dacia baseline, KAN-341',
    license: 'CC BY 4.0',
    attribution:
      'Terra Chartarum; roads joined from corpus stations, frontier corridors drawn editorially',
    documentationLinks: [
      {
        label: 'Shared GIS layers',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/dacia/shared-gis-layers.md',
      },
    ],
    essaySlugs: ['dacia'],
    geometry: 'line',
    color: '#c08a3e',
    perFeatureTime: true,
    facets: ['feature_type', 'confidence', 'geometry_provenance', 'review_status'],
    dash: {
      field: 'feature_type',
      patterns: { road: [], limes: [3, 2] },
    },
    width: {
      field: 'feature_type',
      widths: { road: 1.8, limes: 2.4 },
      fallback: 1.2,
    },
    defaultOn: false,
  },
  {
    id: 'dacia-principalities',
    role: 'historical',
    category: 'territories-boundaries',
    subcategory: 'principality-phases',
    tags: [
      'wallachia',
      'moldavia',
      'transylvania',
      'principalities',
      'habsburg',
      'bessarabia',
      'bukovina',
    ],
    sortWeight: 540,
    room: 'border',
    secondaryRooms: ['map'],
    title: 'Principalities and provinces, 1526-1859',
    description:
      'Wallachia, Moldavia and Transylvania as dated phases rather than as one timeless outline, so that Habsburg Oltenia, Bukovina and Russian Bessarabia appear when they existed and not before. The rings are editorial envelopes, not delimitations.',
    kind: 'vector',
    format: 'geojson',
    url: '/geo/dacia-principalities.geojson',
    yearFrom: 1526,
    yearTo: 1859,
    source: 'Terra Chartarum (compiled) - principality phases 1526-1859, KAN-342',
    license: 'CC BY 4.0',
    attribution: 'Terra Chartarum; territorial phases after Hertslet, The Map of Europe by Treaty',
    documentationLinks: [
      {
        label: 'Shared GIS layers',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/dacia/shared-gis-layers.md',
      },
    ],
    essaySlugs: ['dacia'],
    geometry: 'fill',
    color: '#7b6ba8',
    perFeatureTime: true,
    facets: ['polity_id', 'sovereignty', 'suzerain', 'confidence', 'review_status'],
    defaultOn: false,
  },
  {
    id: 'dacia-josephinian-sheets',
    role: 'evidence',
    category: 'cartographic-evidence',
    subcategory: 'survey-sheet-index',
    tags: [
      'josephinian',
      'first military survey',
      'transylvania',
      'sheet index',
      'kriegsarchiv',
      'survey',
    ],
    sortWeight: 110,
    room: 'archive',
    secondaryRooms: ['map'],
    title: 'Josephinian survey · sheet index',
    description:
      'Where the First Military Survey of Transylvania, 1769-1773, covers the corpus. Each footprint links to the repository that holds the sheet; no scan is served from here, and the footprints are reconstructed rather than taken from the archive index.',
    kind: 'vector',
    format: 'geojson',
    url: '/geo/dacia-josephinian-sheets.geojson',
    yearFrom: 1769,
    yearTo: 1773,
    source: 'Terra Chartarum (compiled) - Josephinian sheet index, KAN-343',
    license: 'CC BY 4.0',
    attribution: 'Terra Chartarum; sheets held by the Kriegsarchiv, Vienna; no scan redistributed',
    documentationLinks: [
      {
        label: 'Shared GIS layers',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/dacia/shared-gis-layers.md',
      },
    ],
    essaySlugs: ['dacia'],
    geometry: 'fill',
    color: '#4f7f8b',
    perFeatureTime: true,
    facets: ['confidence', 'footprint_provenance', 'review_status'],
    defaultOn: false,
  },
  {
    // KAN-353. Styling has to separate a proposal from the line an instrument
    // fixed without relying on colour, so line_type drives both the dash pattern
    // and the width: a proposal reads as dotted and thin, a treaty line solid
    // and heavy, a later reconstruction dashed between them.
    id: 'dacia-treaty-frontiers',
    role: 'historical',
    category: 'conflict-campaigns-frontiers',
    subcategory: 'treaty-frontiers',
    tags: ['dacia', 'treaties', 'frontiers', 'borders', 'diplomacy', 'hertslet', 'delimitation'],
    featured: true,
    sortWeight: 550,
    room: 'border',
    secondaryRooms: ['map'],
    title: 'Treaty frontiers, 1829-1947',
    description:
      'What each settlement moved, as dated phases. Not one instrument in the source ledger has delimitation geometry this project can use, so every line is drawn and declared editorial; where two sources give different lines for one moment, both are kept rather than averaged into a frontier nobody proposed.',
    kind: 'vector',
    format: 'geojson',
    url: '/geo/dacia-treaty-frontiers.geojson',
    yearFrom: 1829,
    yearTo: 1947,
    source: 'Terra Chartarum (compiled) - treaty frontier phases 1829-1947, KAN-352',
    license: 'CC BY 4.0',
    attribution:
      'Terra Chartarum; instruments after Hertslet and the KAN-351 source ledger; all linework editorial',
    documentationLinks: [
      {
        label: 'Treaty frontier source ledger',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/dacia/treaty-frontier-source-ledger.md',
      },
      {
        label: 'Shared GIS layers',
        href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/dacia/shared-gis-layers.md',
      },
    ],
    essaySlugs: ['dacia'],
    geometry: 'line',
    color: '#b0563f',
    perFeatureTime: true,
    facets: ['line_type', 'interpretation_status', 'confidence', 'source_id', 'review_status'],
    dash: {
      field: 'line_type',
      patterns: { treaty_line: [], reconstruction: [4, 2], proposal: [1, 2] },
    },
    width: {
      field: 'line_type',
      widths: { treaty_line: 2.6, reconstruction: 1.8, proposal: 1.2 },
      fallback: 1.2,
    },
    defaultOn: false,
  },
  {
    // ANT-11 / KAN-430. The Antarctic family: four layers split by the argument
    // each one carries, all compiled from one projection by
    // scripts/antarctica/build.py, which the essay also reads. `in-review` is
    // the plain fact throughout - not one record has been read against its
    // source - so nothing is on by default and nothing may be cited as
    // established. The two KAN-423 pilot IDs are retired here; the migration is
    // recorded in docs/antarctica/atlas-family.md.
    id: 'antarctica-conjectured-south',
    role: 'historical',
    category: 'territories-boundaries',
    subcategory: 'conjectured-land',
    collectionIds: ['terra-incognita'],
    tags: [
      'antarctica',
      'terra incognita',
      'terra australis',
      'conjecture',
      'cosmography',
      'southern continent',
      'unreviewed',
    ],
    sortWeight: 600,
    lifecycle: 'in-review',
    room: 'theatre',
    secondaryRooms: ['map'],
    title: 'Terra Australis, the conjectured south (unreviewed)',
    description:
      'The region within which early modern maps drew a southern continent, as a schematic envelope rather than a coastline. No map in the register has been examined, so there is nothing to digitise, and drawing a plausible outline would manufacture the confidence this layer exists to question.',
    kind: 'vector',
    format: 'geojson',
    url: '/geo/antarctica-conjectured-south.geojson',
    yearFrom: 1531,
    yearTo: 1775,
    source: 'Terra Chartarum (compiled) - Antarctic knowledge pilot ant-pilot-0.1, KAN-423',
    license: 'CC BY 4.0',
    attribution: 'Terra Chartarum; schematic envelope, declared editorial generalisation',
    essaySlugs: [],
    geometry: 'line',
    color: '#8a8070',
    perFeatureTime: true,
    facets: ['evidenceClass', 'geometryProvenance', 'confidence', 'reviewState', 'act'],
    dash: {
      field: 'geometryProvenance',
      patterns: { editorial_generalisation: [4, 2], editorial_interpolation: [1, 2] },
    },
    defaultOn: false,
  },
  {
    // Everything that moved: a sampled Cook track, the Endurance approach, the
    // crossing that was announced and never sailed, the drift, and the James
    // Caird. The dash pattern is driven from geometry provenance, so a route we
    // drew can never be rendered as one a source gave.
    id: 'antarctica-expedition-tracks',
    role: 'historical',
    category: 'networks-circulation',
    subcategory: 'voyage-tracks',
    collectionIds: ['terra-incognita'],
    tags: [
      'antarctica',
      'terra incognita',
      'cook',
      'endurance',
      'shackleton',
      'worsley',
      'james caird',
      'drift',
      'southern ocean',
      'unreviewed',
    ],
    sortWeight: 601,
    lifecycle: 'in-review',
    room: 'theatre',
    secondaryRooms: ['road'],
    title: 'Antarctic expedition tracks (unreviewed)',
    description:
      'Where ships went, and how they got there. A planned crossing, a voyage under sail and a drift with the ice are three different kinds of line, and the encoding says which is which: nothing here that Terra Chartarum drew is rendered as though a source had given it.',
    kind: 'vector',
    format: 'geojson',
    url: '/geo/antarctica-expedition-tracks.geojson',
    yearFrom: 1773,
    yearTo: 1916,
    source: 'Terra Chartarum (compiled) - Antarctic knowledge pilot ant-pilot-0.1, KAN-428',
    license: 'CC BY 4.0',
    attribution:
      'Terra Chartarum; sampled and generalised linework, each segment declaring its provenance',
    essaySlugs: [],
    geometry: 'line',
    color: '#7d93ad',
    perFeatureTime: true,
    facets: ['evidenceClass', 'geometryProvenance', 'confidence', 'reviewState', 'act'],
    dash: {
      field: 'geometryProvenance',
      patterns: {
        transcribed_from_coordinates: [],
        derived_from_log: [],
        digitised_from_map: [],
        editorial_generalisation: [4, 2],
        editorial_interpolation: [1, 2],
      },
    },
    defaultOn: false,
  },
  {
    // Dated positions, graduated by confidence rather than by importance: a
    // reader should see at a glance that a contested 1820 sighting and a
    // transcribed farthest south are not the same kind of record.
    id: 'antarctica-observations',
    role: 'historical',
    category: 'places-settlements',
    subcategory: 'observations-and-fixes',
    collectionIds: ['terra-incognita'],
    tags: [
      'antarctica',
      'terra incognita',
      'observations',
      'sightings',
      'navigation',
      'fixes',
      'bellingshausen',
      'bransfield',
      'ross',
      'wilkes',
      'unreviewed',
    ],
    sortWeight: 602,
    lifecycle: 'in-review',
    room: 'theatre',
    secondaryRooms: ['map'],
    title: 'Antarctic observations and fixes (unreviewed)',
    description:
      'Dated positions from Cook to the loss of Endurance: farthest souths, the contested sightings of 1820 and 1840, the nineteenth-century landfalls and the Endurance sequence. A sighting is filed as a report rather than an observation wherever what was seen is still argued over.',
    kind: 'vector',
    format: 'geojson',
    url: '/geo/antarctica-observations.geojson',
    yearFrom: 1774,
    yearTo: 1916,
    source: 'Terra Chartarum (compiled) - Antarctic knowledge pilot ant-pilot-0.1, KAN-425',
    license: 'CC BY 4.0',
    attribution:
      'Terra Chartarum; positions recorded from the general literature and not yet checked against an edition',
    essaySlugs: [],
    geometry: 'circle',
    color: '#c9a227',
    perFeatureTime: true,
    facets: ['evidenceClass', 'geometryProvenance', 'confidence', 'reviewState', 'act'],
    graduate: {
      field: 'confidence',
      radius: { high: 7, medium: 6, low: 4.5, contested: 4.5, unresolved: 4 },
      fallback: 4,
    },
    defaultOn: false,
  },
  {
    // The asset is empty and should be. Every ghost feature in the corpus is
    // non-spatial, because none of the disputed positions has been located, and
    // giving one a point would repeat the original error in our own voice. The
    // contract ships ahead of the positions, as dacia-attestations ships ahead
    // of its review: a reader can find the layer and read why it holds nothing.
    id: 'antarctica-ghost-geographies',
    role: 'historical',
    category: 'territories-boundaries',
    subcategory: 'disproved-geography',
    collectionIds: ['terra-incognita'],
    tags: [
      'antarctica',
      'terra incognita',
      'ghost geography',
      'phantom islands',
      'disproved',
      'error',
      'morrell',
      'wilkes',
      'unreviewed',
    ],
    sortWeight: 603,
    lifecycle: 'in-review',
    room: 'theatre',
    secondaryRooms: ['archive'],
    title: 'Ghost geographies (contract only, no positions located)',
    description:
      'Features claimed, mapped and later removed, held with their original evidence rather than as a list of mistakes. The layer is currently empty: five ghost features are recorded and not one of their disputed positions has been located, so none carries geometry.',
    kind: 'vector',
    format: 'geojson',
    url: '/geo/antarctica-ghost-geographies.geojson',
    yearFrom: 1531,
    yearTo: 1916,
    source: 'Terra Chartarum (compiled) - Antarctic ghost geographies, KAN-426',
    license: 'CC BY 4.0',
    attribution: 'Terra Chartarum; each ghost feature retains its original claimant and source',
    essaySlugs: [],
    geometry: 'circle',
    color: '#b0563f',
    perFeatureTime: true,
    facets: ['evidenceClass', 'geometryProvenance', 'confidence', 'reviewState', 'act'],
    defaultOn: false,
  },
];

export const GEO_LAYERS: GeoLayer[] = RAW.map((l) => GeoLayerSchema.parse(l));

export function getGeoLayers(): GeoLayer[] {
  return GEO_LAYERS;
}
