/**
 * Atlas catalogue migration report (ATLAS-1212 / KAN-408).
 *
 * The classification of every registered layer, generated rather than written:
 * role, category, rooms, collection memberships, lifecycle, runtime
 * availability and public documentation route. KAN-408 asks for a report
 * covering every existing layer, and a hand-maintained one would be a second
 * copy of the registry's state - the copy that goes stale.
 *
 * Also the machine-readable answer to "did anything change identity when the
 * browser changed?": stable IDs and asset URLs are in here, so a diff across
 * releases shows a rename immediately.
 */
import type { APIRoute } from 'astro';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { GEO_LAYERS } from '../../lib/geo';
import { GEO_COLLECTIONS, collectionsForLayer } from '../../lib/geo-collections';
import { projectCatalogue } from '../../lib/atlas-catalogue';
import { loadHandbook } from '../../lib/handbook-content';
import { GEO_RELEASE } from '../../lib/geo-release';

export const GET: APIRoute = async () => {
  const publicDir = join(process.cwd(), 'public');
  const available = GEO_LAYERS.filter((layer) =>
    existsSync(join(publicDir, layer.url.replace(/^\//, ''))),
  ).map((layer) => layer.id);

  const handbook = await loadHandbook();
  const catalogue = projectCatalogue({
    availableLayerIds: available,
    releasedEssaySlugs: [],
    documentationRoutes: handbook.routes,
  });
  const rows = new Map(catalogue.layers.map((row) => [row.id, row]));

  return new Response(
    JSON.stringify(
      {
        report: 'atlas-catalogue-migration',
        ticket: 'KAN-408',
        release: GEO_RELEASE,
        layerCount: GEO_LAYERS.length,
        collectionCount: GEO_COLLECTIONS.length,
        layers: GEO_LAYERS.map((layer) => ({
          id: layer.id,
          title: layer.title,
          url: layer.url,
          role: layer.role,
          category: layer.category ?? null,
          subcategory: layer.subcategory ?? null,
          room: layer.room ?? null,
          secondaryRooms: layer.secondaryRooms,
          collections: collectionsForLayer(layer.id).map((collection) => collection.id),
          lifecycle: layer.lifecycle,
          availability: rows.get(layer.id)?.availability ?? 'not-expected',
          browsable: rows.has(layer.id),
          perFeatureTime: layer.perFeatureTime,
          facets: layer.facets,
          documentationRoute: handbook.routes[layer.id] ?? null,
          yearFrom: layer.yearFrom,
          yearTo: layer.yearTo,
        })),
        collections: GEO_COLLECTIONS.map((collection) => ({
          id: collection.id,
          title: collection.title,
          layerIds: collection.layerIds,
          defaultLayerIds: collection.defaultLayerIds,
          room: collection.room ?? null,
        })),
      },
      null,
      2,
    ),
    { headers: { 'content-type': 'application/json; charset=utf-8' } },
  );
};
