# CND v1.0 release candidate

`make dacia` produces `data/dacia/release/cnd-1.0-rc1` alongside the frozen
CND 0.1 pilot. The candidate contains CSV, Parquet, JSON-LD and Atlas-ready
GeoJSON, plus its schema, methodology, citation, licence, QA report and
hash manifest. It is deterministic and locally usable, but it is not described
as citable until the manifest's `releaseStatus` becomes `ready`.

## Coverage and migration

The v1.0 candidate holds 120 normalized places and 25 coherent source witnesses
or series. Eighty place authorities were imported from the Pleiades published
places snapshot dated 21 August 2026. Their stable `plc-pleiades-*` IDs retain
the Pleiades identifier and representative point; their associated attestations
record Pleiades display labels as scholarly locator evidence, not as ancient
witness spellings. Imported rows stop at `normalized` and remain outside the
publishable tier until a human reviews them. Ancient, medieval, early-modern,
survey/cadastral and modern regimes each have named source IDs in
`reference/cnd-v1-release.json`; a missing ID blocks readiness.

Place and source IDs published in CND 0.1 are immutable. The release audit
checks that every 0.1 ID still exists. A retirement or merge must be added to
`reference/cnd-id-migrations.csv`; IDs are never silently reassigned.

Nomen Errans continues to resolve its source and place keys against the CND
authority. Every Hiatus witness family now carries a `corpus_source_id` that
resolves against the same source table. The validator rejects a missing or
private duplicate authority, and the QA report exposes both consumers' status.

## Scholarly and rights gate

Schema correctness is not scholarly correctness. The QA report separately
counts records checked from a witness or edition, publishable attestations,
`source_silent` rows, low-confidence identifications and reconstructed place
geometry. Unreviewed or verification-debt rows remain in the research candidate
and cannot enter its publishable spatial tier.

The KAN-365 audit on 25 August 2026 is frozen in
[`reference/cnd-v1-qa.json`](../../data/dacia/reference/cnd-v1-qa.json). It
independently compared one imported Pleiades authority from each of the eight
represented regions against the cited live authority record. All eight names
and representative points matched. The check is recorded as machine-assisted
and promotes no review state; it must not be mistaken for a named scholar's
review of an ancient witness or edition.

The same audit enumerates every record needing an explicit disposition before
publication: five `source_silent` attestations, three low-confidence
attestations, ten editorially reconstructed place geometries and two sources
whose rights remain unknown. All are excluded from the publishable tier. The
generated QA report lists their IDs, all open verification-debt IDs and any
publishable row that refers to open debt. The validator rejects a stale audit,
an unresolved authority locator, incomplete regional sampling, or a public row
that still cites open debt.

Terra Chartarum metadata and annotations are offered under CC BY 4.0. An
upstream source's `rights_statement` applies to that source or work; it does not
grant rights to redistribute repository imagery. The candidate redistributes no
source imagery. The two `rights_unknown` sources remain research-only; no public
attestation currently references any source, so the public-source rights set is
empty and complete.

The candidate remains blocked: there are no human-reviewed or publishable
attestations. Its source audit is now explicit, but the audit does not manufacture
the scholarly sign-off required to make v1.0 citable.

## DOI

DOI deposit is deferred because it needs an authenticated external repository
and a repository/legal deposit decision, neither of which belongs in source
control. This does not prevent deterministic local candidate builds. It does
prevent claiming that this blocked candidate is the final citable v1.0 release.
