import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const register = JSON.parse(
  readFileSync(resolve(ROOT, 'data/release/epic-evidence.json'), 'utf8'),
);
const failures = [];
const seen = new Set();

if (register.schemaVersion !== 1 || register.status !== 'repository_verified') {
  failures.push('Epic evidence register must be repository_verified schema v1');
}
if (
  !Array.isArray(register.verificationCommands) ||
  !['npm run check', 'npm test', 'npm run build'].every((command) =>
    register.verificationCommands.includes(command),
  )
) {
  failures.push('Epic evidence register must preserve check, test, and build commands');
}

for (const epic of register.epics ?? []) {
  if (!/^KAN-\d+$/.test(epic.key) || seen.has(epic.key)) {
    failures.push(`Invalid or duplicate epic key '${epic.key}'`);
  }
  seen.add(epic.key);
  if (!epic.title || (epic.acceptance?.length ?? 0) < 3) {
    failures.push(`${epic.key}: title and at least three acceptance statements are required`);
  }
  if ((epic.children?.length ?? 0) === 0) {
    failures.push(`${epic.key}: completed Jira children must be recorded`);
  }
  for (const evidence of epic.evidence ?? []) {
    const path = resolve(ROOT, evidence);
    if (!existsSync(path) || !statSync(path).isFile()) {
      failures.push(`${epic.key}: evidence file is missing: ${evidence}`);
    }
  }
}

const batched = (register.batches ?? []).flatMap((batch) => batch.epicKeys ?? []);
if (
  batched.length !== seen.size ||
  new Set(batched).size !== batched.length ||
  batched.some((key) => !seen.has(key))
) {
  failures.push('Batch membership must cover every registered epic exactly once');
}

if (failures.length > 0) {
  console.error(`Epic evidence QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Epic evidence QA passed: ${seen.size} epic(s) across ${register.batches.length} batch(es).`,
);
