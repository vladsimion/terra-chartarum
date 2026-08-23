/**
 * Build-time Handbook loader (ATLAS-1216 / KAN-412).
 *
 * The only place that touches the content collection and the filesystem. It
 * hands the pure projection everything it needs and then refuses to return a
 * corpus that failed validation, so an unresolved reference or a leaked held
 * essay fails `astro build` rather than reaching a reader.
 *
 * There is no runtime fetch of anything here: Pattern A source documents are
 * read from the repository at build time, and Confluence is never contacted.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getCollection } from 'astro:content';
import { GEO_LAYERS } from './geo';
import { GEO_COLLECTIONS } from './geo-collections';
import { isReleased, showUnreleased } from './release';
import {
  handbookCoverage,
  projectHandbook,
  type HandbookProjection,
  type RawHandbookEntry,
} from './handbook-projection';

let cached: HandbookProjection | null = null;

async function releasedEssaySlugs(): Promise<string[]> {
  const essays = await getCollection('essays');
  return essays
    .filter((essay) => showUnreleased() || isReleased(essay.data.releaseAt))
    .map((essay) => essay.slug);
}

export async function loadHandbook(): Promise<HandbookProjection> {
  if (cached) return cached;

  const entries = await getCollection('handbook');
  const raw: RawHandbookEntry[] = [];
  for (const entry of entries) {
    const sourcePath = (entry.data as { sourcePath?: string }).sourcePath;
    raw.push({
      data: entry.data,
      body: entry.body ?? '',
      sourceMarkdown: sourcePath
        ? await readFile(join(process.cwd(), sourcePath), 'utf8')
        : undefined,
    });
  }

  const projection = projectHandbook(raw, {
    layerIds: GEO_LAYERS.map((layer) => layer.id),
    collectionIds: GEO_COLLECTIONS.map((collection) => collection.id),
    releasedEssaySlugs: await releasedEssaySlugs(),
  });

  if (projection.errors.length > 0) {
    throw new Error(
      `Atlas Handbook validation failed:\n  ${projection.errors.join('\n  ')}\n` +
        'Public documentation is generated only from a corpus that resolves.',
    );
  }

  cached = projection;
  return projection;
}

/** Published layers that still have no public documentation record. */
export async function loadHandbookCoverage() {
  return handbookCoverage(GEO_LAYERS, await loadHandbook());
}
