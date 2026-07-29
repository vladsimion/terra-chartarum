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

Reprioritisation: the remaining high-confidence work was the migrated port
gazetteer. KAN-193–197 form one regional/phase slice under KAN-151 and could be
closed with exact authority-table checks; the scholarly chronology and
georeferencing tickets remained blocked on sources.

## Batch 4 — eastern maritime-node contracts

Tickets: KAN-193, KAN-194, KAN-195, KAN-196, KAN-197.

- Added executable regional requirements for Egypt, the Black Sea/Sea of Azov
  and Crimea, Cyprus and the Levant.
- Locked Alexandria and Beirut's fondaco documentation to foreign-port rows.
- Locked Famagusta's four phases and Limassol/Kyrenia's two phases.
- Locked the Constantinople quarter's three legal-status phases, including the
  non-sovereign Latin Empire representation.
- Made the contract a pre-write VMN build gate and documented its role.

Evidence: `make vmn`, the 86/7/11-feature compiled QA gate and geo release
integrity checks pass with unchanged binaries.

Reprioritisation: after the eastern groups, KAN-198–202 were the next coherent
deliverable because they combine the remaining KAN-151 assembly/count work with
the first KAN-150 polity distinction. They also make the output gate stronger
before the final Aegean/Crete/Morea phase audit.

## Batch 5 — staging, typing and assembled-output gates

Tickets: KAN-198, KAN-199, KAN-200, KAN-201, KAN-202.

- Locked Messina, Palermo, Syracuse and Trapani as open-ended staging rows
  without inferring Venetian sovereignty.
- Documented quarter, rival colony, foreign port, trading post, feudatory,
  staging and direct-rule distinctions.
- Enforced floors of 86 phases/70 stable ports and all 12 required statuses.
- Added exact authority-table/FGB feature-count and `(port_id, valid_from)` key
  parity to reject stale or partial bundles.
- Locked seven Cycladic ports to `duchy_archipelago` + `feudatory`, keeping Tino
  available for its separate direct-Venetian phase.

Evidence: source build, compiled 86/7/11 QA, projection parity, geo manifest
integrity and formatting gates pass.

Reprioritisation: KAN-203–207 remained the final unblocked five. They close the
same KAN-150 regional compilation boundary; replacing any of them with
chronology/georeferencing work would have required unavailable source editions
or reference plates.

## Batch 6 — Crete, Morea and temporal-phase closure

Tickets: KAN-203, KAN-204, KAN-205, KAN-206, KAN-207.

- Locked Candia plus five Cretan subject ports to direct Venetian polity rows.
- Locked Argos, Coron, Malvasia, Modon and Nauplia to their early and
  Morean-War phases, including Nauplia's later capital status.
- Required exact counts and non-overlap for all eleven known changing-control
  port IDs (the intentionally overlapping Venice metropole/capital roles remain
  outside that sovereignty-change rule).
- Required in-row Archipelago decision evidence for all seven feudatory ports
  and kept Tino typed to direct Venetian rule.
- Added a combined 19-port Aegean/Crete/Morea gate with feudatory, subject and
  capital coverage.

Evidence: source build, compiled 86/7/11 QA, exact projection parity, geo release
integrity, lint, formatting, Astro checks, the 109-test unit suite, production
build, and all 33 Chromium journeys (including the 18-frame VMN visual scrub)
pass.
