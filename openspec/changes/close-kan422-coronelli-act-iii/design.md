# Design

## Context

See [proposal.md](proposal.md) - Why / What Changes. The existing Coronelli
tables (`data/antarctica/coronelli-lineage.csv`, `coronelli-annotations.csv`,
plus the Coronelli rows in `sources.csv` and `map-objects.csv`) already carry
a source-lineage classification (inherited / reported / observational) and
rights/scan metadata for the plate that has been read. This change extends
the same tables and the same classification scheme to newly examined
objects; it introduces one new concept (an explicit negative-audit record)
that those tables don't yet need to represent, because nothing has been
"audited and found empty" before now.

## Goals / Non-Goals

**Goals:**

- Make "not yet audited" and "audited, nothing found" distinguishable in the
  data, so the twelve-volume/`Libro dei Globi` audit and the globe
  examination leave a record even when they turn up nothing.
- Reuse the programme's existing five-way evidence classification
  (conjectured, reported, observed, surveyed-reconciled, disproved) for the
  globe's calotte content rather than inventing a parallel scheme.
- Keep every new row machine-checkable the same way existing Antarctic data
  is: `src/lib/corpus.ts` validation plus the Python rule/build tests
  `release-readiness.md` references.

**Non-Goals:**

- This change does not itself flip any release-readiness gate
  (`sources-read`, `public-tier`, `layers-published` stay review-gated until
  a human reads and reviews the resulting claims - that is a separate, later
  step, not part of closing KAN-422).
- No new data files or schema files are introduced; existing CSVs gain rows
  and, where needed, an `audit_result` field - not new tables.

## Decisions

**Represent a negative audit as a row, not an absence.** A volume with no
southern-polar content still needs a record (per spec: "audited with no
content found" must be distinguishable from "not yet audited"). Add an
`audit_result` column (values: `content_found` / `none_found`) to
`coronelli-annotations.csv` rather than creating a separate audit-log file - keeps one table as the source of truth for "what has been looked at" instead
of splitting that across two files. Alternative considered: a separate
`coronelli-audit-log.csv`. Rejected because nothing else in the programme
splits positive/negative findings across files, and the existing
`ant-gap-*` identifiers already give each gap a stable row to update in
place.

**Classify the globe's calotte with the same five-way vocabulary already
used programme-wide**, rather than a Coronelli-specific scheme, so cross-act
comparison (Mercator, Ortelius) stays possible without a translation layer.

**Sequence the four research gaps in the order `release-readiness.md`
already recommends** (leverage order: unread leaves and Milanesi first, then
the globe's calotte), because the calotte finding is described there as the
sharpest test of the argument and is most useful once the textual gaps are
closed - reading it first risks re-doing the classification once the
Milanesi/leaf context changes the read.

## Risks / Trade-offs

- **A newly read leaf could complicate rather than confirm the central
  claim** (e.g. reveal southern content Coronelli did not, in fact,
  dismiss) → mitigation: the proposal and spec require recording what is
  found either way, not just evidence that supports the existing argument;
  `docs/antarctica/coronelli-act-iii.md`'s "Corrections" section already
  models withdrawing an earlier claim once contradicted.
- **No catalogued Coronelli gore set may be accessible for direct
  examination** (rights/access constraints are a recurring theme in this
  programme, per `image-rights` being a rights-blocked gate) → mitigation:
  the spec's audit requirement applies equally to "identified content" and
  "none found"; an inability to access a specific gore set is itself a
  recordable finding with a source-access note, not a silent gap.
- **Adding `audit_result` to `coronelli-annotations.csv` could conflict with
  a concurrent edit to that file from other in-flight Antarctica work in
  this shared checkout** → mitigation: re-check the file's current schema
  immediately before implementation, since other sessions may have touched
  it since this proposal was drafted.
