/**
 * Remove held legacy essays' embed payloads from the build (KAN-263).
 *
 * Legacy essays render inside an iframe pointing at /embed/<slug>/, which is a
 * static directory under public/ and is therefore copied into dist/ regardless
 * of whether the essay's route was built. Without this step an embargoed legacy
 * essay would stay fully readable at a guessable URL. dist/ is generated, so
 * deleting from it is safe and idempotent.
 *
 * Runs after `astro build` and before the indexing QA that asserts the result.
 */
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { partitionEssays, showUnreleased } from './lib/essay-release.mjs';

const DIST = resolve(import.meta.dirname, '../dist');

if (!existsSync(DIST)) {
  console.error('dist/ is missing; run the production build first');
  process.exit(1);
}

if (showUnreleased()) {
  console.log('SHOW_UNRELEASED=1: keeping every embed payload.');
  process.exit(0);
}

const { held } = partitionEssays();
const pruned = [];

for (const { slug, embedPath } of held) {
  if (!embedPath) continue;
  // /embed/<slug>/index.html -> dist/embed/<slug>
  const dir = resolve(DIST, embedPath.replace(/^\//, '').replace(/\/[^/]*$/, ''));
  if (!dir.startsWith(`${DIST}/`)) throw new Error(`${slug}: embedPath escapes dist/`);
  if (!existsSync(dir)) continue;
  rmSync(dir, { recursive: true, force: true });
  pruned.push(slug);
}

console.log(
  pruned.length
    ? `Pruned held embed payloads: ${pruned.join(', ')}.`
    : 'No held legacy embeds to prune.',
);
