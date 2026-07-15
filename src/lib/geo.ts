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
});

export type GeoLayer = z.infer<typeof GeoLayerSchema>;

// Sample layers. URLs point at open, keyless, cloud-native sources; the render
// pipeline (EG3) will attach them. Validated at module load so a malformed
// entry fails the build rather than the browser.
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
    defaultOn: false,
  },
  {
    id: 'roman-empire-117',
    title: 'Roman Empire, AD 117',
    description: 'Provincial extent at Trajan\'s greatest reach — context for the Dacia essay.',
    kind: 'vector',
    format: 'pmtiles',
    url: '/geo/roman-empire-117.pmtiles',
    yearFrom: 106,
    yearTo: 271,
    source: 'Ancient World Mapping Center (placeholder)',
    license: 'CC BY',
    attribution: 'AWMC',
    essaySlugs: ['dacia'],
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
    defaultOn: false,
  },
];

export const GEO_LAYERS: GeoLayer[] = RAW.map((l) => GeoLayerSchema.parse(l));

export function getGeoLayers(): GeoLayer[] {
  return GEO_LAYERS;
}
