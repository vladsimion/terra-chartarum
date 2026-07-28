# Next-thirty implementation ledger

This release is delivered as six independently validated batches of five Jira
tickets. The open KAN queue and roadmap are re-read after every batch; selection
favours unblocked work with repository-verifiable acceptance criteria. Tickets
that require unavailable scholarly editions or new rights clearance are not
represented as complete.

## Batch 1 — geo delivery contract

Tickets: KAN-208, KAN-209, KAN-210, KAN-211, KAN-212.

- Kept Shapely explicit in the CI VMN job, aligned with the local VMN toolchain.
- Added automated catalogue, metadata, GeoJSON, integrity and manifest QA.
- Curated all nine published GIS assets with provenance, rights, CRS, geometry,
  temporal extent and expected feature counts.
- Added deterministic release IDs and content-addressed URLs for Atlas loading.
- Documented layer registration, temporal filtering and supported fallbacks.

Evidence: `npm run geo:validate`, focused Vitest geo tests, Astro check and
`make vmn-validate` pass.
