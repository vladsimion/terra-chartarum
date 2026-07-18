/**
 * GeoLayer registry (ATLAS-EG2)
 *
 * Typed, Zod-validated manifest of historical-GIS layers for the atlas map.
 * Mirrors the essay registry. Regime A (serverless, cloud-native): layers are
 * static, cloud-native formats (PMTiles / COG / FlatGeobuf / GeoJSON) served
 * from a CDN and versioned with the repo — no database. Escalation to Regime B
 * (PostGIS + Martin/TiTiler) is deferred until a spatial-query/scale trigger.
 *
 * The full tile-rendering pipeline (attaching the pmtiles protocol, adding COG
 * raster sources) lands in ATLAS-EG3; this module defines and validates the
 * layers the map will consume, and drives the layer-toggle UI.
 */
import { z } from 'astro:content';
import { ROOM_SLUGS } from '../data/rooms';

export const GeoLayerSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  kind: z.enum(['vector', 'raster', 'georef-scan']),
  format: z.enum(['pmtiles', 'cog', 'flatgeobuf', 'geojson']),
  url: z.string(),
  crs: z.string().default('EPSG:4326'),
  yearFrom: z.number(),
  yearTo: z.number(),
  source: z.string(),
  license: z.string(),
  attribution: z.string(),
  gazetteerIds: z.array(z.string()).optional(),
  essaySlugs: z.array(z.string()).optional(),
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
  // circle-radius by value, e.g. ports sized by `type`.
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
  // Seven-room cosmography (TC-102 / KAN-93). Optional here so existing layers
  // validate unchanged; retro-tagging lands in KAN-94.
  room: z.enum(ROOM_SLUGS).optional(),
  secondaryRooms: z.array(z.enum(ROOM_SLUGS)).max(2).default([]),
  roomAnchor: z.boolean().default(false),
});

export type GeoLayer = z.infer<typeof GeoLayerSchema>;

// Layers. The Natural Earth base layers and the AWMC Roman Empire extent are real
// GeoJSON assets served from /public/geo and rendered live by the MapLibre pipeline
// (ATLAS-EG3). The remaining essay-linked historical layer (venetian-maritime-1400)
// is registered with its metadata but ships no binary yet — producing it needs
// tippecanoe/GDAL tooling and sourced data (ATLAS-EG3 remainder / EG6). The atlas
// enables a toggle only when its asset is actually present, so a layer goes live
// the moment its file is dropped in.
// Validated at module load so a malformed entry fails the build, not the browser.
const RAW: unknown[] = [
  {
    id: 'ne-coastline',
    room: 'earth',
    title: 'Natural Earth — Coastline',
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
    room: 'earth',
    title: 'Natural Earth — Land outline',
    description: 'Coastal landmass outlines — a subtle physical frame for the corpus.',
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
    room: 'earth',
    secondaryRooms: ['road'],
    title: 'Natural Earth — Rivers',
    description: 'Major river and lake centrelines — waterways that carried maps and trade.',
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
    room: 'border',
    title: 'Modern national boundaries',
    description: 'Present-day land borders — an anachronistic reference grid over historical maps.',
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
    room: 'map',
    title: 'Depicted extents (corpus)',
    description:
      'The area each corpus map depicts — one footprint polygon per map, keyed by mapId.',
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
    room: 'border',
    secondaryRooms: ['archive'],
    title: 'Roman Empire, AD 117',
    description: "Imperial extent at Trajan's greatest reach — context for the Dacia essay.",
    kind: 'vector',
    format: 'geojson',
    url: '/geo/roman-empire-117.geojson',
    yearFrom: 106,
    yearTo: 271,
    source: 'Ancient World Mapping Center (AWMC), UNC Chapel Hill — roman_empire_ce_117_extent',
    license: 'ODbL 1.0',
    attribution:
      'Ancient World Mapping Center; derived from the Barrington Atlas and OpenStreetMap (ODbL)',
    essaySlugs: ['dacia'],
    geometry: 'fill',
    color: '#d98860',
    defaultOn: false,
  },
  // Venetian Maritime Network, c.1400 (VMN). Three per-geometry FGB layers per the
  // frozen data dictionary (VMN-3) and the VMN-2 render findings: ports graduated by
  // type, routes dashed by route_type, possessions as phased fills. The .fgb binaries
  // are produced by the compilation tickets (VMN-9/13/19); until an asset is on disk
  // the atlas shows the layer as pending. Styling + loader capability lands in VMN-20.
  {
    id: 'venetian-ports',
    room: 'road',
    secondaryRooms: ['border'],
    title: 'Venetian maritime ports, c.1200–1500',
    description:
      'Stato da màr nodes — colonies, trading quarters, staging calls and Genoese rivals — graduated by type, each status phase a separate feature.',
    kind: 'vector',
    format: 'flatgeobuf',
    url: '/geo/venetian-ports.fgb',
    yearFrom: 1200,
    yearTo: 1500,
    source: "Terra Chartarum (compiled) — Lane 1973; O'Connell 2009",
    license: 'CC BY',
    attribution: "Terra Chartarum; after Lane and O'Connell",
    essaySlugs: ['venice-sicily'],
    geometry: 'circle',
    color: '#e2a93f',
    perFeatureTime: true,
    graduate: {
      field: 'type',
      radius: {
        metropole: 9,
        colony: 7,
        trading_quarter: 6,
        independent: 5,
        rival_genoese: 5,
        staging: 4,
      },
      fallback: 4,
    },
    defaultOn: false,
  },
  {
    id: 'venetian-routes',
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
    source: 'Terra Chartarum (compiled) — Lane 1973',
    license: 'CC BY',
    attribution: 'Terra Chartarum; after Lane',
    essaySlugs: ['venice-sicily'],
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
    room: 'border',
    secondaryRooms: ['road'],
    title: 'Venetian possessions, c.1200–1500',
    description:
      'Territorial extent of the stato da màr — direct rule, protectorates, condominia and contested ground — as phased fills clipped to the coastline.',
    kind: 'vector',
    format: 'flatgeobuf',
    url: '/geo/venetian-possessions.fgb',
    yearFrom: 1200,
    yearTo: 1500,
    source: "Terra Chartarum (compiled) — Lane 1973; O'Connell 2009",
    license: 'CC BY',
    attribution: "Terra Chartarum; after Lane and O'Connell",
    essaySlugs: ['venice-sicily'],
    geometry: 'fill',
    color: '#9c5b52',
    perFeatureTime: true,
    defaultOn: false,
  },
];

export const GEO_LAYERS: GeoLayer[] = RAW.map((l) => GeoLayerSchema.parse(l));

export function getGeoLayers(): GeoLayer[] {
  return GEO_LAYERS;
}
