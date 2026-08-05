import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { analyseCollectionCompleteness } from '../../lib/collection-completeness';
import { getCorpus } from '../../lib/corpus';
import { isReleased } from '../../lib/release';

export async function GET(_context: APIContext) {
  const essays = await getCollection('essays');
  const liveEssaySlugs = new Set(
    essays.filter((essay) => isReleased(essay.data.releaseAt)).map((essay) => essay.slug),
  );
  const report = analyseCollectionCompleteness(getCorpus(), liveEssaySlugs);
  return new Response(JSON.stringify(report, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}
