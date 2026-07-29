import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DATA_ROOT = resolve(ROOT, 'data/editorial');
const ROOM_SLUGS = new Set(['earth', 'map', 'city', 'border', 'road', 'archive', 'theatre']);
const STAGES = [
  'concept',
  'corpus',
  'research',
  'outline',
  'draft',
  'build',
  'design-qa',
  'publish',
];

function words(markdown) {
  return (markdown.match(/\b[\p{L}\p{N}][\p{L}\p{N}’'-]*\b/gu) ?? []).length;
}

function check(condition, message, errors) {
  if (!condition) errors.push(message);
}

function validatePackage(file) {
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  const label = manifest.slug ?? file;
  const errors = [];
  const stage = STAGES.indexOf(manifest.stage);

  check(stage >= 0, `${label}: unknown stage '${manifest.stage}'`, errors);
  check(ROOM_SLUGS.has(manifest.room), `${label}: invalid primary room`, errors);
  check(
    (manifest.secondaryRooms ?? []).every((room) => ROOM_SLUGS.has(room)),
    `${label}: invalid secondary room`,
    errors,
  );
  check((manifest.thesis ?? '').length >= 80, `${label}: thesis is not substantive`, errors);
  check((manifest.whyThisSite ?? '').length >= 80, `${label}: why-this-site angle missing`, errors);

  const corpus = manifest.corpus ?? [];
  const mapIds = new Set(corpus.map((map) => map.id));
  if (stage >= STAGES.indexOf('corpus')) {
    check(
      corpus.length >= 8,
      `${label}: corpus has ${corpus.length} maps; expected at least 8`,
      errors,
    );
    check(
      corpus.filter((map) => map.hero).length === 1,
      `${label}: corpus must identify exactly one hero map`,
      errors,
    );
    for (const map of corpus) {
      check(
        Boolean(map.id && map.title && map.sourceUrl),
        `${label}: incomplete corpus row`,
        errors,
      );
      check(
        Boolean(map.rights && map.scanQuality),
        `${label}/${map.id}: rights or scan QA missing`,
        errors,
      );
    }
  }

  const bibliography = manifest.bibliography ?? [];
  const citationIds = new Set(bibliography.map((item) => item.id));
  if (stage >= STAGES.indexOf('research')) {
    check(
      bibliography.length >= 4,
      `${label}: research bibliography has fewer than 4 entries`,
      errors,
    );
    check(
      (manifest.claims ?? []).length >= 4,
      `${label}: claims ledger has fewer than 4 claims`,
      errors,
    );
    for (const claim of manifest.claims ?? []) {
      check(
        (claim.citationIds ?? []).every((id) => citationIds.has(id)),
        `${label}: claim '${claim.id}' has an unresolved citation`,
        errors,
      );
    }
  }

  if (stage >= STAGES.indexOf('outline')) {
    check(
      (manifest.sections ?? []).length >= 3,
      `${label}: outline has fewer than 3 sections`,
      errors,
    );
    check(
      (manifest.sections ?? []).some((section) => Boolean(section.interactive)),
      `${label}: outline identifies no interactive moment`,
      errors,
    );
    for (const section of manifest.sections ?? []) {
      check(
        (section.mapIds ?? []).length > 0 && section.mapIds.every((mapId) => mapIds.has(mapId)),
        `${label}/${section.id}: section map assignment is empty or unresolved`,
        errors,
      );
    }
  }

  if (stage >= STAGES.indexOf('draft')) {
    const draftPath = resolve(ROOT, manifest.draftPath ?? '');
    check(existsSync(draftPath), `${label}: draft file does not exist`, errors);
    if (existsSync(draftPath)) {
      const count = words(readFileSync(draftPath, 'utf8'));
      check(
        count >= (manifest.minimumDraftWords ?? 3000),
        `${label}: draft has ${count} words; expected at least ${manifest.minimumDraftWords ?? 3000}`,
        errors,
      );
    }
  }

  if (stage >= STAGES.indexOf('build')) {
    check(
      existsSync(resolve(ROOT, manifest.contentPath ?? '')),
      `${label}: built essay content path does not exist`,
      errors,
    );
  }

  if (stage >= STAGES.indexOf('design-qa')) {
    check(
      existsSync(resolve(ROOT, manifest.coverPath ?? '')),
      `${label}: cover asset does not exist`,
      errors,
    );
    check(
      existsSync(resolve(ROOT, manifest.ogPath ?? '')),
      `${label}: social preview asset does not exist`,
      errors,
    );
  }

  if (stage >= STAGES.indexOf('publish')) {
    check(
      existsSync(resolve(ROOT, manifest.seriesPath ?? '')),
      `${label}: series or editorial index path does not exist`,
      errors,
    );
  }

  return errors;
}

if (!existsSync(DATA_ROOT)) {
  console.log('Editorial QA: no packages registered.');
  process.exit(0);
}

const files = readdirSync(DATA_ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => resolve(DATA_ROOT, entry.name, 'manifest.json'))
  .filter(existsSync);

const errors = files.flatMap(validatePackage);
if (errors.length) {
  console.error(`Editorial QA failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Editorial QA passed: ${files.length} package(s).`);
