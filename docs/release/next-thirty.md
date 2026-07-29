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

Reprioritisation: with the shared Atlas consumer stable, KAN-173/174 became
bounded projections of already-published route fields rather than competing
platform work. KAN-218/219 supplied the extraction and API guardrails, while
KAN-175 stayed a no-build source-hunt spike. This deliberately unparked the
small VMN-E7 slice without unblocking unsupported data claims.

## Batch 3 — reusable patterns and standalone VMN exploration

Tickets: KAN-173, KAN-174, KAN-175, KAN-218, KAN-219.

- Added a self-contained, deterministic force-directed explorer projected from
  the seven published route records; port focus highlights whole connected
  routes.
- Added the requested commodity authority table and click-to-filter behaviour,
  with every route tag resolving through that table.
- Published a source-hunt decision: no medieval route-cost layer from modern
  reanalysis; PMIP4 remains conditional modelled-climate context only.
- Audited recurring essay patterns by current consumer and reuse gap.
- Defined props, slots, theming, accessibility and extraction conventions for
  the shared library.

Evidence: Astro check, focused VMN network Vitest tests, production build and the
Chromium standalone-network Playwright flow pass.
