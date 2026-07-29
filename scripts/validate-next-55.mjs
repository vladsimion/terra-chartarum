import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const release = JSON.parse(readFileSync(resolve(ROOT, 'data/release/next-55.json'), 'utf8'));
const failures = [];
const batches = release.batches ?? [];
const selected = batches.flatMap(({ tickets }) => tickets ?? []);
const selectedSet = new Set(selected);
const done = release.boardOutcomes?.done ?? [];
const inProgress = release.boardOutcomes?.inProgress ?? [];
const excluded = release.boardOutcomes?.excludedSourceBlockers ?? [];
const outcomes = [...done, ...inProgress];

if (
  release.schemaVersion !== 1 ||
  release.requestedTicketCount !== 55 ||
  release.branch !== 'codex/next-fifty-five'
) {
  failures.push('Release manifest identity/count is invalid');
}
if (
  batches.length !== 11 ||
  batches.some(({ tickets }) => tickets?.length !== 5) ||
  batches.some(({ batch }, index) => batch !== index + 1)
) {
  failures.push('Release must contain 11 ordered batches of exactly five tickets');
}
if (selected.length !== 55 || selectedSet.size !== 55) {
  failures.push('Release ticket selection must contain exactly 55 unique keys');
}
if (
  outcomes.length !== 55 ||
  new Set(outcomes).size !== 55 ||
  outcomes.some((key) => !selectedSet.has(key))
) {
  failures.push('Done and In Progress outcomes must partition the selected 55 tickets');
}
if (
  done.length !== 53 ||
  JSON.stringify([...inProgress].sort()) !== JSON.stringify(['KAN-140', 'KAN-154']) ||
  JSON.stringify([...excluded].sort()) !== JSON.stringify(['KAN-250', 'KAN-253'])
) {
  failures.push('Expected 53 Done, two In Progress, and the two named source blockers');
}
if (excluded.some((key) => selectedSet.has(key))) {
  failures.push('Excluded source blockers must not appear in the selected 55');
}
if (
  !release.evidenceBoundary?.includes('citations must not be invented') ||
  !release.evidenceBoundary?.includes('remain In Progress')
) {
  failures.push('Release manifest must preserve the scholarly evidence boundary');
}

if (failures.length > 0) {
  console.error(`Next-55 release QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Next-55 release QA passed: 11 × 5, 53 Done, 2 In Progress, 2 excluded blockers.');
