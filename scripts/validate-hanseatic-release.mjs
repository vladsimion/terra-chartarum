import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const readJson = (path) => JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'));
const release = readJson('data/release/hanseatic.json');
const generated = readJson('src/data/hanseatic/generated/manifest.json');
const essay = readFileSync(
  resolve(ROOT, 'src/content/essays/the-league-that-left-no-map.mdx'),
  'utf8',
);
const failures = [];
const expectedTickets = Array.from({ length: 21 }, (_, index) => `KAN-${295 + index}`);
const expectedEpics = {
  'KAN-295': ['KAN-302', 'KAN-303'],
  'KAN-296': ['KAN-304', 'KAN-305'],
  'KAN-297': ['KAN-306', 'KAN-307'],
  'KAN-298': ['KAN-308', 'KAN-309'],
  'KAN-299': ['KAN-310', 'KAN-311'],
  'KAN-300': ['KAN-312', 'KAN-313'],
  'KAN-301': ['KAN-314', 'KAN-315'],
};
const expectedWitnesses = [
  'hse-rudimentum-lubeck',
  'hse-carta-marina',
  'hse-lubeck-view',
  'hse-hamburg-view',
  'hse-london-view',
  'hse-bruges-view',
  'hse-cologne-view',
  'hse-bremen-view',
];

if (release.schemaVersion !== 1 || release.status !== 'qa_complete') {
  failures.push('Hanseatic release must be qa_complete schema v1');
}
if (release.release !== generated.release) {
  failures.push(`Release id '${release.release}' does not match generated '${generated.release}'`);
}
if (release.releaseAt !== '2026-08-08' || !essay.includes(`releaseAt: '${release.releaseAt}'`)) {
  failures.push('Release date does not match the published essay gate');
}
if (JSON.stringify(release.tickets) !== JSON.stringify(expectedTickets)) {
  failures.push('Release ticket order/scope is incomplete');
}
if (JSON.stringify(release.epics) !== JSON.stringify(expectedEpics)) {
  failures.push('The seven HSE epics must partition all fourteen leaf tickets');
}
if (
  release.programmeRollup?.status !== 'repository_verified' ||
  release.programmeRollup?.epicCount !== 7 ||
  release.programmeRollup?.leafTicketCount !== 14
) {
  failures.push('Hanseatic programme roll-up totals are incomplete');
}
if (JSON.stringify(release.publishedWitnesses) !== JSON.stringify(expectedWitnesses)) {
  failures.push('The eight published witness ids are incomplete or out of order');
}
if (
  release.historicalRightsReview?.status !== 'passed' ||
  release.historicalRightsReview?.publishedWitnessCount !== 8 ||
  release.historicalRightsReview?.referenceOnlyDocumentCount !== 4
) {
  failures.push('Historical and rights review totals are incomplete');
}
for (const path of Object.values(release.assets ?? {})) {
  if (!existsSync(resolve(ROOT, path))) failures.push(`Release asset is missing: ${path}`);
}
const lighthouse = release.lighthouse ?? {};
if (
  !Number.isFinite(lighthouse.hanseaticPerformance) ||
  !Number.isFinite(lighthouse.comparablePerformance) ||
  lighthouse.regressionPoints !==
    lighthouse.comparablePerformance - lighthouse.hanseaticPerformance ||
  lighthouse.regressionPoints > lighthouse.maximumRegressionPoints
) {
  failures.push('Lighthouse comparison is missing or exceeds the 2-point regression budget');
}
if ((release.qa ?? []).length < 7 || release.qa.some((gate) => gate.status !== 'passed')) {
  failures.push('Every recorded QA gate must pass');
}
if (
  (release.postPublicationChecks ?? []).length < 6 ||
  release.postPublicationChecks.some((check) => check.status !== 'passed')
) {
  failures.push('Every post-publication surface check must pass');
}

if (failures.length > 0) {
  console.error(`Hanseatic release QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Hanseatic release QA passed: ${release.programmeRollup.epicCount} epics, ${release.programmeRollup.leafTicketCount} leaves, ${release.publishedWitnesses.length} witnesses, ${release.qa.length} gates, ${lighthouse.regressionPoints}-point Lighthouse regression.`,
);
