import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getEssays } from '../lib/registry';

// Essay feed (KAN-22). `context.site` derives from `site` in astro.config —
// currently the ATLAS-605 placeholder origin; it resolves to the real domain
// once that ticket lands. Sorted newest-first by publish date.
export async function GET(context: APIContext) {
  const essays = await getEssays();
  const items = essays
    .map((e) => ({
      title: e.data.title,
      description: e.data.summary,
      link: `/essays/${e.slug}/`,
      pubDate: new Date(e.data.publishedAt),
    }))
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: 'Terra Chartarum — Essays',
    description:
      'An interactive historical atlas — a gallery of cartographic visual essays.',
    site: context.site!,
    items,
  });
}
