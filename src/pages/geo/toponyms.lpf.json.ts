import type { APIContext } from 'astro';
import { getToponyms, toLinkedPlacesCollection } from '../../lib/toponyms';

/**
 * Linked Places Format (LPF) gazetteer export (KAN-46).
 *
 * LPF is GeoJSON-LD, so the collection remains useful to ordinary GeoJSON
 * consumers while exposing names and verified authority links for WHG,
 * Pleiades, and Pelagios/Peripleo workflows.
 */
export async function GET(context: APIContext) {
  const endpoint = new URL('/geo/toponyms.lpf.json', context.site ?? context.url).href;
  const collection = toLinkedPlacesCollection(getToponyms(), endpoint);

  return new Response(JSON.stringify(collection), {
    headers: {
      'Content-Type': 'application/ld+json',
      Link: `<${collection['@context']}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"`,
    },
  });
}
