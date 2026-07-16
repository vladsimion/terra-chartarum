import type { APIContext } from 'astro';
import { getCorpus, centuryLabel } from '../lib/corpus';
import { getCartographers, mapsByCartographer } from '../lib/cartographers';
import { getToponyms, toponymNames } from '../lib/toponyms';
import { getEssays, formatYear } from '../lib/registry';

/**
 * Unified search index (ATLAS-1101 / KAN-76). One static JSON document over
 * essays + maps + cartographers + toponyms, in rss.xml.ts style, consumed by the
 * Fuse.js SiteSearch island (KAN-77). Toponyms (KAN-75) let a reader search by
 * any historical name a place is known by and land on it in the atlas.
 */
interface SearchDoc {
  type: 'essay' | 'map' | 'cartographer' | 'toponym';
  id: string;
  url: string;
  title: string;
  subtitle?: string;
  text?: string;
  region?: string;
  era?: string;
  tags?: string[];
  year?: number;
}

export async function GET(_context: APIContext) {
  const docs: SearchDoc[] = [];

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
