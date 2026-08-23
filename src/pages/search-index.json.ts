import type { APIContext } from 'astro';
import { getCorpus, centuryLabel } from '../lib/corpus';
import { getCartographers, mapsByCartographer } from '../lib/cartographers';
import { getToponyms, toponymNames } from '../lib/toponyms';
import { getEssays, formatYear } from '../lib/registry';
import type { RoomSlug } from '../data/rooms';
import { loadHandbook } from '../lib/handbook-content';

/** Collapse an item's primary + secondary room tags into a slug list (KAN-100). */
function roomTags(item: { room?: RoomSlug; secondaryRooms?: RoomSlug[] }): RoomSlug[] {
  return [item.room, ...(item.secondaryRooms ?? [])].filter((r): r is RoomSlug => Boolean(r));
}

/**
 * Unified search index (ATLAS-1101 / KAN-76). One static JSON document over
 * essays + maps + cartographers + toponyms, in rss.xml.ts style, consumed by the
 * Fuse.js SiteSearch island (KAN-77). Toponyms (KAN-75) let a reader search by
 * any historical name a place is known by and land on it in the atlas.
 */
interface SearchDoc {
  /**
   * `reference` covers the Atlas Handbook: layer records, methods, evidence
   * ledgers, data fields and the glossary. It is a distinct type so reference
   * material is findable without crowding essay results - a reader searching
   * "frontier" wants the essay first and the layer record close behind, not
   * fifteen glossary fragments (KAN-416).
   */
  type: 'essay' | 'map' | 'cartographer' | 'toponym' | 'reference';
  id: string;
  url: string;
  title: string;
  subtitle?: string;
  text?: string;
  region?: string;
  era?: string;
  tags?: string[];
  /** Room slugs this doc belongs to, primary + secondary (KAN-100 facet). */
  rooms?: RoomSlug[];
  year?: number;
}

export async function GET(_context: APIContext) {
  const docs: SearchDoc[] = [];

  // Handbook records (KAN-416). Only the title and the one-line summary are
  // indexed, never the body: a layer record runs to a couple of thousand words
  // and indexing all of it would let one page dominate every query.
  const handbook = await loadHandbook();
  for (const entry of handbook.docs) {
    docs.push({
      type: 'reference',
      id: entry.doc.id,
      url: entry.route,
      title: entry.doc.title,
      subtitle: entry.doc.summary,
      tags: [entry.doc.docType, entry.doc.programme],
    });
  }

  const essays = await getEssays();
  for (const e of essays) {
    docs.push({
      type: 'essay',
      id: e.slug,
      url: `/essays/${e.slug}/`,
      title: e.data.title,
      subtitle: e.data.subtitle,
      text: e.data.summary,
      region: e.data.regions.join(', '),
      era: e.data.eras.join(', '),
      tags: [...e.data.regions, ...e.data.eras],
      rooms: roomTags(e.data),
      year: e.data.yearFrom,
    });
  }

  for (const m of getCorpus()) {
    docs.push({
      type: 'map',
      id: m.id,
      url: `/collection/${m.id}/`,
      title: m.title,
      subtitle: m.cartographer,
      text: m.blurb,
      region: m.region,
      era: centuryLabel(m.year),
      tags: m.tags,
      rooms: roomTags(m),
      year: m.year,
    });
  }

  for (const c of getCartographers()) {
    const maps = mapsByCartographer(c.id);
    docs.push({
      type: 'cartographer',
      id: c.id,
      url: `/cartographers/${c.id}/`,
      title: c.name,
      subtitle:
        c.born || c.died
          ? `${c.born ? formatYear(c.born) : '?'} – ${c.died ? formatYear(c.died) : '?'}`
          : undefined,
      text: c.bio,
      region: c.places.join(', '),
      tags: [...c.places, ...maps.map((m) => m.title)],
      rooms: roomTags(c),
      year: c.born,
    });
  }

  for (const t of getToponyms()) {
    const names = toponymNames(t);
    const historical = names.slice(1); // everything but the modern name
    docs.push({
      type: 'toponym',
      id: t.id,
      // Deep-link into the atlas, which centres its dedicated toponym pin.
      url: `/atlas/#topo-${t.id}`,
      title: t.modern,
      subtitle: historical.join(' · '),
      text: names.join(' '),
      tags: historical,
    });
  }

  return new Response(JSON.stringify(docs), {
    headers: { 'Content-Type': 'application/json' },
  });
}
