/**
 * Release one essay (KAN-263).
 *
 *   npm run essay:release <slug>          -- release today
 *   npm run essay:release <slug> --on 2026-09-15
 *
 * Rewrites that essay's `releaseAt` and prints what is still held. The site is
 * static and Cloudflare Pages builds only on a push, so the essay goes live on
 * the next deploy - commit and push to finish the job.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { partitionEssays, today } from './lib/essay-release.mjs';

const ESSAYS = resolve(import.meta.dirname, '../src/content/essays');
const args = process.argv.slice(2);
const slug = args.find((arg) => !arg.startsWith('--'));
const onIndex = args.indexOf('--on');
const date = onIndex === -1 ? today() : args[onIndex + 1];

if (!slug) {
  console.error('Usage: npm run essay:release <slug> [--on YYYY-MM-DD]');
  process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) {
  console.error(`--on expects YYYY-MM-DD, received '${date}'`);
  process.exit(1);
}

const file = readdirSync(ESSAYS).find((entry) => entry.replace(/\.(md|mdx)$/, '') === slug);
if (!file) {
  console.error(`No essay '${slug}' under src/content/essays/`);
  process.exit(1);
}

const path = resolve(ESSAYS, file);
const source = readFileSync(path, 'utf8');
const current = source.match(/^releaseAt: '?(\d{4}-\d{2}-\d{2})'?\s*$/m);
if (!current) {
  console.error(`${file}: no releaseAt to rewrite`);
  process.exit(1);
}
if (current[1] === date) {
  console.log(`${slug} already carries releaseAt ${date}; nothing to do.`);
  process.exit(0);
}

writeFileSync(path, source.replace(current[0], `releaseAt: '${date}'`));
console.log(`${slug}: releaseAt ${current[1]} -> ${date}`);

const { held } = partitionEssays();
console.log(
  held.length
    ? `\nStill held (${held.length}):\n${held
        .map(({ slug: s, releaseAt }) => `  ${releaseAt}  ${s}`)
        .join('\n')}`
    : '\nNothing is held - the whole collection is live.',
);
console.log('\nCommit and push to publish; Cloudflare Pages builds on push to main.');
