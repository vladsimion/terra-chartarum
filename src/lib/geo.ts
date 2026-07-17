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
  // Render hints consumed by the MapLibre pipeline (ATLAS-EG3).
  geometry: z.enum(['line', 'fill']).default('line'),
  color: z.string().default('#d4b87a'),
  // Vector-tile source layer (PMTiles); ignored for geojson.
  sourceLayer: z.string().optional(),
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
  {
    id: 'venetian-maritime-1400',
    title: 'Venetian Maritime Network, c.1400',
    description: 'Trade routes and stato da màr nodes underpinning the Venice/Sicily duel.',
    kind: 'vector',
    format: 'flatgeobuf',
    url: '/geo/venetian-network-1400.fgb',
    yearFrom: 1200,
    yearTo: 1500,
    source: 'Essay dataset (placeholder)',
    license: 'CC BY',
    attribution: 'Terra Chartarum',
    essaySlugs: ['venice-sicily'],
    geometry: 'line',
    color: '#96cc84',
    defaultOn: false,
  },
];

export const GEO_LAYERS: GeoLayer[] = RAW.map((l) => GeoLayerSchema.parse(l));

export function getGeoLayers(): GeoLayer[] {
  return GEO_LAYERS;
}
