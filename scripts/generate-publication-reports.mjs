#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { format } from 'prettier';

const ROOT = resolve(import.meta.dirname, '..');
const SITE = 'https://terra-chartarum.org';
const mode = process.argv.includes('--write') ? 'write' : 'check';

function readJson(path) {
  return JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'));
}

function corpusMarkdown(report) {
  const rows = report.rooms
    .map((room) => {
      const titles = room.essays.length
        ? room.essays.map((essay) => `[${essay.title}](${SITE}/essays/${essay.slug}/)`).join(' · ')
        : '-';
      return `| ${room.order}. ${room.title} | ${room.essays.length} | ${titles} |`;
    })
    .join('\n');
  const held = report.heldEssays.length
    ? report.heldEssays
        .map(
          (essay) =>
            `| ${essay.title} | ${essay.room} | ${essay.releaseAt === '2099-01-01' ? 'unscheduled' : essay.releaseAt} |`,
        )
        .join('\n')
    : '| - | - | - |';

  return `# Generated corpus status

> Generated from the production release gate and validated registries. Do not edit by hand. Run \`npm run reports:write\` after an intentional content change.

## Counts

| Content type | Count |
| --- | ---: |
| Live essays | ${report.counts.essaysLive} |
| Held essays | ${report.counts.essaysHeld} |
| Map records | ${report.counts.maps} |
| Cartographers | ${report.counts.cartographers} |
| Bibliography entries | ${report.counts.bibliography} |
| Toponyms | ${report.counts.toponyms} |
| Rooms | ${report.counts.rooms} |
| GIS layers | ${report.counts.geoLayers} |

Geo release: \`${report.geoRelease}\`.

## Live essays by primary room

| Room | Count | Essays |
| --- | ---: | --- |
${rows}

## Held essays

| Essay | Primary room | Release |
| --- | --- | --- |
${held}
`;
}

function completenessMarkdown(report) {
  const fields = report.fields
    .map((field) => `| ${field.label} | ${field.complete}/${field.total} | ${field.percent}% |`)
    .join('\n');
  const records = report.records
    .map(
      (record) =>
        `| [${record.title}](${SITE}/collection/${record.id}/) | ${record.sourceEssayLive ? 'live' : 'held'} | ${record.percent}% | ${record.missing.length ? record.missing.join(', ') : '-'} |`,
    )
    .join('\n');
  const auditFields = report.objectAudit.fields
    .map(
      (field) =>
        `| ${field.label} | ${field.recorded} | ${field.notApplicable} | ${field.notYetVerified} | ${field.unknown} |`,
    )
    .join('\n');
  const queue = report.enrichmentQueue
    .map((group) => {
      const rows = group.records.length
        ? group.records
            .map(
              (record) =>
                `| \`${record.canonicalId}\` | [${record.title}](${SITE}/collection/${record.id}/) | ${record.auditPercent}% | ${record.gaps.length ? record.gaps.join(', ') : '-'} |`,
            )
            .join('\n')
        : '| - | - | - | - |';
      return `### ${group.label}\n\nOwner: **${group.owner}**. Queue limit: **${group.limit}**.\n\n| Canonical map reference | Object | Recorded | Audit gaps |\n| --- | --- | ---: | --- |\n${rows}`;
    })
    .join('\n\n');
  const auditedRecords = report.records
    .map((record) => {
      const gaps = Object.entries(record.audit)
        .filter(([, status]) => status !== 'recorded' && status !== 'not_applicable')
        .map(([criterion, status]) => `${criterion}:${status}`);
      return `| \`${record.canonicalId}\` | ${record.enrichmentTrack} | ${record.auditPercent}% | ${gaps.length ? gaps.join(', ') : '-'} |`;
    })
    .join('\n');

  return `# Generated collection completeness report

> Generated from the validated collection registry. This is an editorial prioritisation report, not a public quality score. Do not edit by hand. Run \`npm run reports:write\` after an intentional record change.

Overall metadata coverage: **${report.present}/${report.possible} fields (${report.percent}%)** across **${report.mapCount} maps**.

## Coverage by field

| Field | Complete | Coverage |
| --- | ---: | ---: |
${fields}

## Volume VII object-standard audit

Every current collection record is classified against the KAN-390 audit fields. A missing value is recorded as \`not_yet_verified\`, \`unknown\` or \`not_applicable\`; it is never treated as silently complete. Existing local map IDs remain stable under KAN-376, so the canonical cross-programme form is \`tc:atlas:map:<local-id>\` rather than a retrospective rename.

| Audit field | Recorded | Not applicable | Not yet verified | Unknown |
| --- | ---: | ---: | ---: | ---: |
${auditFields}

Dealer/auction descriptions retained only as discovery or provenance evidence: **${report.objectAudit.discoveryEvidenceOnly.length}**. ${report.objectAudit.discoveryEvidenceOnly.length ? report.objectAudit.discoveryEvidenceOnly.map((id) => `\`${id}\``).join(', ') : 'No current record declares dealer/auction text in its provenance fields.'}

## Bounded enrichment queue

The queue is ranked by active programme value and then by lowest object-standard coverage. Dacia/In Manibus remains owned by KAN-360/KAN-361 and is listed here without creating a parallel enrichment stream.

${queue}

## Per-record object audit

| Canonical map reference | Priority track | Recorded | Classified gaps |
| --- | --- | ---: | --- |
${auditedRecords}

## Records

Live-source records are listed first, then by lowest completeness so the most useful editorial work appears earliest.

| Map | Source essay | Complete | Missing |
| --- | --- | ---: | --- |
${records}
`;
}

const outputs = [
  {
    path: 'docs/generated/corpus-status.md',
    content: corpusMarkdown(readJson('dist/data/corpus-status.json')),
  },
  {
    path: 'docs/generated/collection-completeness.md',
    content: completenessMarkdown(readJson('dist/data/collection-completeness.json')),
  },
];

for (const output of outputs) {
  output.content = await format(output.content, { parser: 'markdown' });
}

let failed = false;
for (const output of outputs) {
  const path = resolve(ROOT, output.path);
  if (mode === 'write') {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, output.content);
    console.log(`Wrote ${output.path}`);
    continue;
  }
  let actual = '';
  try {
    actual = readFileSync(path, 'utf8');
  } catch {
    // A missing report is the same class of drift as stale content.
  }
  if (actual !== output.content) {
    console.error(`${output.path} is stale; run npm run reports:write`);
    failed = true;
  }
}

if (failed) process.exit(1);
if (mode === 'check') console.log(`Publication reports are current: ${outputs.length} file(s).`);
