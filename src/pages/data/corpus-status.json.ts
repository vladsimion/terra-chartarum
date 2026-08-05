import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { ROOMS } from '../../data/rooms';
import { getFullBibliography } from '../../lib/bibliography';
import { getCartographers } from '../../lib/cartographers';
import { getCorpus } from '../../lib/corpus';
import { GEO_LAYERS } from '../../lib/geo';
import { GEO_RELEASE } from '../../lib/geo-release';
import { isReleased } from '../../lib/release';
import { getToponyms } from '../../lib/toponyms';

export async function GET(_context: APIContext) {
  const essays = await getCollection('essays');
  const live = essays.filter((essay) => isReleased(essay.data.releaseAt));
  const held = essays.filter((essay) => !isReleased(essay.data.releaseAt));
  const byRoom = ROOMS.map((room) => ({
    slug: room.slug,
    title: room.title,
    order: room.order,
    essays: live
      .filter((essay) => essay.data.room === room.slug)
      .sort((a, b) => a.data.order - b.data.order)
      .map((essay) => ({ slug: essay.slug, title: essay.data.title })),
  }));

  const body = {
    schemaVersion: 1,
    releasePolicy: 'releaseAt <= build date',
    counts: {
      essaysLive: live.length,
      essaysHeld: held.length,
      maps: getCorpus().length,
      cartographers: getCartographers().length,
      bibliography: getFullBibliography().length,
      toponyms: getToponyms().length,
      rooms: ROOMS.length,
      geoLayers: GEO_LAYERS.length,
    },
    geoRelease: GEO_RELEASE,
    rooms: byRoom,
    heldEssays: held
      .sort(
        (a, b) => a.data.releaseAt.localeCompare(b.data.releaseAt) || a.slug.localeCompare(b.slug),
      )
      .map((essay) => ({
        slug: essay.slug,
        title: essay.data.title,
        room: essay.data.room,
        releaseAt: essay.data.releaseAt,
      })),
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}
