# CND v1.0 release candidate

`make dacia` produces `data/dacia/release/cnd-1.0-rc1` alongside the frozen
CND 0.1 pilot. The candidate contains CSV, Parquet, JSON-LD and Atlas-ready
GeoJSON, plus its schema, methodology, citation, licence, QA report and
hash manifest. It is deterministic and locally usable, but it is not described
as citable until the manifest's `releaseStatus` becomes `ready`.

## Coverage and migration

The v1.0 target is approximately 120 normalized places and 25 coherent source
witnesses or series. The build publishes the exact count and shortfall instead
of presenting the 0.1 pilot as if it had reached that target. Ancient, medieval,
early-modern, survey/cadastral and modern regimes each have named source IDs in
`reference/cnd-v1-release.json`; a missing ID blocks readiness.

Place and source IDs published in CND 0.1 are immutable. The release audit
checks that every 0.1 ID still exists. A retirement or merge must be added to
`reference/cnd-id-migrations.csv`; IDs are never silently reassigned.

Nomen Errans continues to resolve its source and place keys against the CND
authority. The Hiatus witness-family ledger remains a candidate research ledger
and has not yet been migrated to CND source IDs; the QA report names that
authority reconciliation as a blocker rather than hiding a second authority.

## Scholarly and rights gate

Schema correctness is not scholarly correctness. The QA report separately
counts records checked from a witness or edition, publishable attestations,
`source_silent` rows, low-confidence identifications and reconstructed place
geometry. Unreviewed or verification-debt rows remain in the research candidate
and cannot enter its publishable spatial tier.

Terra Chartarum metadata and annotations are offered under CC BY 4.0. An
upstream source's `rights_statement` applies to that source or work; it does not
grant rights to redistribute repository imagery. The candidate redistributes no
source imagery.

## DOI

DOI deposit is deferred because it needs an authenticated external repository
and a repository/legal deposit decision, neither of which belongs in source
control. This does not prevent deterministic local candidate builds. It does
prevent claiming that this blocked candidate is the final citable v1.0 release.
