import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { URL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..');
const DATA_ROOT = resolve(ROOT, 'data/editorial');
const RELEASE_POLICY = resolve(DATA_ROOT, 'release-policy.json');
const WAVE_TWO_BACKLOG = resolve(DATA_ROOT, 'wave-2/backlog.json');
const WAVE_THREE_BACKLOG = resolve(DATA_ROOT, 'wave-3/backlog.json');
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

function localCrossLinkResolves(rawPath) {
  if (typeof rawPath !== 'string' || !rawPath.startsWith('/')) return false;
  const pathname = new URL(rawPath, 'https://terra-chartarum.local').pathname;
  const room = pathname.match(/^\/rooms\/([^/]+)\/$/);
  if (room) return ROOM_SLUGS.has(room[1]);

  const essay = pathname.match(/^\/essays\/([^/]+)\/$/);
  if (essay) {
    return ['md', 'mdx'].some((extension) =>
      existsSync(resolve(ROOT, `src/content/essays/${essay[1]}.${extension}`)),
    );
  }

  const series = pathname.match(/^\/series\/([^/]+)\/$/);
  if (series) return existsSync(resolve(ROOT, `src/pages/series/${series[1]}.astro`));

  if (pathname === '/collection/')
    return existsSync(resolve(ROOT, 'src/pages/collection/index.astro'));
  return false;
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
    const review = manifest.editorialReview ?? {};
    const accepted = new Set(['approved', 'approved-with-notes']);
    check(accepted.has(review.outline), `${label}: outline review is not approved`, errors);
    check(accepted.has(review.narrative), `${label}: narrative review is not approved`, errors);
    check(
      /^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt ?? ''),
      `${label}: editorial review date is missing`,
      errors,
    );
    check(
      existsSync(resolve(ROOT, review.notesPath ?? '')),
      `${label}: editorial review notes do not exist`,
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
      existsSync(resolve(ROOT, manifest.publishedPath ?? '')),
      `${label}: published content path does not exist`,
      errors,
    );
    check(
      (manifest.crossLinks ?? []).length >= 3,
      `${label}: publish package has fewer than 3 cross-links`,
      errors,
    );
    check(
      new Set(manifest.crossLinks ?? []).size === (manifest.crossLinks ?? []).length,
      `${label}: publish package has duplicate cross-links`,
      errors,
    );
    for (const path of manifest.crossLinks ?? []) {
      check(
        localCrossLinkResolves(path),
        `${label}: cross-link '${path}' does not resolve to a published local route`,
        errors,
      );
    }
    if (manifest.seriesPath) {
      check(
        existsSync(resolve(ROOT, manifest.seriesPath)),
        `${label}: series path does not exist`,
        errors,
      );
    }
    for (const path of manifest.cartometryPaths ?? []) {
      check(
        existsSync(resolve(ROOT, path)),
        `${label}: Cartometry export '${path}' missing`,
        errors,
      );
    }
  }

  return errors;
}

function validateWaveThreeBacklog() {
  if (!existsSync(WAVE_THREE_BACKLOG)) return [];
  const backlog = JSON.parse(readFileSync(WAVE_THREE_BACKLOG, 'utf8'));
  const entries = backlog.entries ?? [];
  const errors = [];
  const slugs = entries.map((entry) => entry.slug);
  const titles = entries.map((entry) => entry.title);
  const orders = entries.map((entry) => entry.waveOrder);

  check(backlog.wave === 3, 'wave-3: incorrect wave number', errors);
  check(backlog.intakeTicket === 'KAN-220', 'wave-3: intake ticket must be KAN-220', errors);
  check(backlog.status === 'verified', 'wave-3: backlog is not verified', errors);
  check(backlog.verificationTicket === 'KAN-225', 'wave-3: incorrect verification ticket', errors);
  check(
    backlog.componentModel === 'jira-label',
    'wave-3: unsupported component ownership model',
    errors,
  );
  check(entries.length === 12, `wave-3: expected 12 candidates; found ${entries.length}`, errors);
  check(new Set(slugs).size === entries.length, 'wave-3: duplicate slug', errors);
  check(new Set(titles).size === entries.length, 'wave-3: duplicate title', errors);
  check(
    JSON.stringify(orders) === JSON.stringify(Array.from({ length: 12 }, (_, index) => index + 1)),
    'wave-3: waveOrder must be the complete sequence 1–12',
    errors,
  );

  for (const entry of entries) {
    check(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug ?? ''),
      `wave-3/${entry.title}: invalid slug`,
      errors,
    );
    check(ROOM_SLUGS.has(entry.room), `wave-3/${entry.title}: invalid primary room`, errors);
    check(
      (entry.secondaryRooms ?? []).length <= 2 &&
        (entry.secondaryRooms ?? []).every((room) => ROOM_SLUGS.has(room) && room !== entry.room),
      `wave-3/${entry.title}: invalid secondary rooms`,
      errors,
    );
    check(
      /^KAN-22[1-4]$/.test(entry.bundleTicket ?? ''),
      `wave-3/${entry.title}: invalid bundle ticket`,
      errors,
    );
    check(
      ['candidate', 'tracked'].includes(entry.state),
      `wave-3/${entry.title}: invalid state`,
      errors,
    );
    check(
      (entry.roomRationale ?? '').length >= 80,
      `wave-3/${entry.title}: room rationale is not substantive`,
      errors,
    );
    check(/^KAN-\d+$/.test(entry.ticket ?? ''), `wave-3/${entry.title}: ticket missing`, errors);
    check(
      entry.component === 'Editorial',
      `wave-3/${entry.title}: Editorial ownership missing`,
      errors,
    );
    check(
      (entry.interactivePattern ?? '').length >= 40,
      `wave-3/${entry.title}: interactive pattern is not substantive`,
      errors,
    );
  }

  const tracked = entries.filter((entry) => entry.state === 'tracked');
  check(
    tracked.length === 12,
    `wave-3: expected 12 tracked entries; found ${tracked.length}`,
    errors,
  );
  check(
    tracked.every((entry) => /^KAN-22[1-4]$/.test(entry.bundleTicket)),
    'wave-3: tracked entries must belong to KAN-221–224',
    errors,
  );
  check(
    new Set(entries.map((entry) => entry.ticket)).size === entries.length,
    'wave-3: duplicate candidate ticket',
    errors,
  );
  return errors;
}

function validateWaveTwoBacklog() {
  if (!existsSync(WAVE_TWO_BACKLOG)) return [];
  const backlog = JSON.parse(readFileSync(WAVE_TWO_BACKLOG, 'utf8'));
  const entries = backlog.entries ?? [];
  const errors = [];
  const expectedTickets = [
    'KAN-228',
    'KAN-227',
    'KAN-230',
    'KAN-226',
    'KAN-231',
    'KAN-232',
    'KAN-233',
    'KAN-234',
  ];

  check(backlog.wave === 2, 'wave-2: incorrect wave number', errors);
  check(backlog.intakeTicket === 'KAN-229', 'wave-2: intake ticket must be KAN-229', errors);
  check(
    backlog.verificationTicket === 'KAN-235',
    'wave-2: verification ticket must be KAN-235',
    errors,
  );
  check(
    ['in-progress', 'verified'].includes(backlog.status),
    `wave-2: invalid release status '${backlog.status}'`,
    errors,
  );
  check(entries.length === 8, `wave-2: expected 8 essays; found ${entries.length}`, errors);
  check(
    JSON.stringify(entries.map((entry) => entry.waveOrder)) ===
      JSON.stringify(Array.from({ length: 8 }, (_, index) => index + 1)),
    'wave-2: waveOrder must be the complete sequence 1–8',
    errors,
  );
  check(
    JSON.stringify(entries.map((entry) => entry.editorialRef)) ===
      JSON.stringify(Array.from({ length: 8 }, (_, index) => `TC-10.${index + 1}`)),
    'wave-2: editorial references must be the canonical TC-10.1–TC-10.8 sequence',
    errors,
  );
  check(
    JSON.stringify(entries.map((entry) => entry.ticket)) === JSON.stringify(expectedTickets),
    'wave-2: ticket-to-editorial-order mapping has drifted',
    errors,
  );
  check(
    new Set(entries.map((entry) => entry.slug)).size === entries.length,
    'wave-2: duplicate slug',
    errors,
  );
  check(
    new Set(entries.map((entry) => entry.title)).size === entries.length,
    'wave-2: duplicate title',
    errors,
  );

  for (const entry of entries) {
    const label = `wave-2/${entry.ticket ?? entry.title}`;
    check(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug ?? ''), `${label}: invalid slug`, errors);
    check(ROOM_SLUGS.has(entry.room), `${label}: invalid primary room`, errors);
    check(
      (entry.secondaryRooms ?? []).length <= 2 &&
        (entry.secondaryRooms ?? []).every((room) => ROOM_SLUGS.has(room) && room !== entry.room),
      `${label}: invalid secondary rooms`,
      errors,
    );
    check(entry.component === 'Editorial', `${label}: Editorial ownership missing`, errors);
    check(
      ['AdaptiveTimeline', 'Scrollytelling', 'CompareSlider', 'FragmentLedger'].includes(
        entry.componentAssignment,
      ),
      `${label}: component assignment is missing or unsupported`,
      errors,
    );
    check(
      (entry.interactivePattern ?? '').length >= 60,
      `${label}: interactive pattern is not substantive`,
      errors,
    );
    check(
      (entry.roomRationale ?? '').length >= 100,
      `${label}: room rationale is not substantive`,
      errors,
    );
    check(
      ['tracked', 'delivered'].includes(entry.state),
      `${label}: invalid state '${entry.state}'`,
      errors,
    );
    if (entry.state === 'delivered') {
      const contentPath = resolve(ROOT, entry.contentPath ?? '');
      check(existsSync(contentPath), `${label}: delivered content is missing`, errors);
      if (existsSync(contentPath)) {
        check(
          words(readFileSync(contentPath, 'utf8')) >= 700,
          `${label}: delivered essay is shorter than 700 words`,
          errors,
        );
      }
    }
  }

  if (backlog.status === 'verified') {
    check(
      entries.every((entry) => entry.state === 'delivered'),
      'wave-2: verified backlog still contains undelivered essays',
      errors,
    );
  }

  return errors;
}

function validateReleasePolicy() {
  const errors = [];
  check(existsSync(RELEASE_POLICY), 'release-policy: policy file is missing', errors);
  if (!existsSync(RELEASE_POLICY)) return errors;

  const policy = JSON.parse(readFileSync(RELEASE_POLICY, 'utf8'));
  check(policy.schemaVersion === 1, 'release-policy: unsupported schema version', errors);
  check(policy.policyTicket === 'KAN-260', 'release-policy: policy ticket must be KAN-260', errors);
  check(policy.parentTicket === 'KAN-12', 'release-policy: parent ticket must be KAN-12', errors);
  check(
    existsSync(resolve(ROOT, policy.styleGuide ?? '')),
    'release-policy: style guide does not resolve',
    errors,
  );
  check(
    existsSync(resolve(ROOT, policy.reviewTemplate ?? '')),
    'release-policy: review template does not resolve',
    errors,
  );
  const requiredCommands = new Set(policy.requiredCommands ?? []);
  for (const command of [
    'npm run editorial:validate',
    'npm run check',
    'npm test',
    'npm run build',
  ]) {
    check(
      requiredCommands.has(command),
      `release-policy: required command '${command}' missing`,
      errors,
    );
  }
  check(
    JSON.stringify(policy.approvalGate?.acceptedDecisions) ===
      JSON.stringify(['approved', 'approved-with-notes']),
    'release-policy: approval decisions have drifted',
    errors,
  );
  check(
    (policy.holdCriteria ?? []).length >= 5,
    'release-policy: expected at least five hold criteria',
    errors,
  );
  check(
    (policy.rollbackCriteria ?? []).length >= 3,
    'release-policy: expected at least three rollback criteria',
    errors,
  );
  for (const criterion of [...(policy.holdCriteria ?? []), ...(policy.rollbackCriteria ?? [])]) {
    check(
      Boolean(criterion.id && criterion.condition && (criterion.releaseAction || criterion.action)),
      'release-policy: incomplete hold or rollback criterion',
      errors,
    );
  }
  check(
    (policy.recoveryRule ?? '').length >= 120,
    'release-policy: recovery rule is not substantive',
    errors,
  );
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

const errors = [
  ...files.flatMap(validatePackage),
  ...validateReleasePolicy(),
  ...validateWaveTwoBacklog(),
  ...validateWaveThreeBacklog(),
];
if (errors.length) {
  console.error(`Editorial QA failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Editorial QA passed: ${files.length} package(s).`);
