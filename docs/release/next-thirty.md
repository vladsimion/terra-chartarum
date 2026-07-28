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

Reprioritisation: the live queue still showed KAN-213–216 as the immediate
consumers of the new delivery contract. KAN-217 joined them because it supplied
the lowest-cost regression gate for the shared UI work. Standalone VMN embeds
remained behind the common platform.

## Batch 2 — unified Atlas interaction surface

Tickets: KAN-213, KAN-214, KAN-215, KAN-216, KAN-217.

- Normalised FlatGeobuf conversion to valid 2D EPSG:4326 geometry with spatial
  indexing and an explicit, scale-dependent simplification option.
- Added a responsive map-and-context platform shell.
- Kept related essay, summary, place/time metadata and entry links beside map,
  layer and timeline interactions.
- Synchronised essay/time selection, highlighting and URL state across controls
  and the compressed essay timeline.
- Locked the four shared interactive patterns to both the worked MDX sample and
  the starter inventory.

Evidence: Astro check, focused Vitest component tests, geo release QA and the
Chromium Atlas context/timeline Playwright flow pass.
