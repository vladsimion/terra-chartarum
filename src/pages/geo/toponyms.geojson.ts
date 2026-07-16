import type { APIContext } from 'astro';
import { getToponyms, toponymNames } from '../../lib/toponyms';

/**
 * Toponym concordance endpoint (KAN-75), in rss.xml.ts style. Emits the authored
 * gazetteer (src/lib/toponyms.ts) as a GeoJSON FeatureCollection of Points so the
 * same source drives the atlas overlay, the search index, and any external
 * consumer. Coordinates are [lng, lat] (GeoJSON order).
 */
export async function GET(_context: APIContext) {
  const fc = {
    type: 'FeatureCollection',
    features: getToponyms().map((t) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: t.coords },
      properties: {
        id: t.id,
        modern: t.modern,
        ancient: t.ancient,
        medieval: t.medieval,
        variants: t.variants,
        names: toponymNames(t),
        pleiadesId: t.pleiadesId ?? null,
        essaySlugs: t.essaySlugs,
        mapIds: t.mapIds,
      },
    })),
  };

  return new Response(JSON.stringify(fc), {
    headers: { 'Content-Type': 'application/geo+json' },
  });
}
