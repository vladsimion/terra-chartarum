# Atlas GIS documentation audit (KAN-409)

The Atlas GeoLayer registry publishes its documentation as a flat list of peer
links. A reader opening a layer meets a source ledger, a data dictionary, a
decisions log and a developer deep-link guide side by side, with nothing to say
which of them explains the map and which explains the build. Nineteen layers
carry twenty-four such links to nine documents, all of them on GitHub.

This is the audit that has to happen before any of those links is rewritten. It
inventories every entry, decides who owns the content and who it is for, and
proposes where the public half of it should live. It changes no link and no
layer ID: KAN-409 classifies, KAN-418 cuts over.

The canonical artefact is
[`data/atlas/documentation-inventory.json`](../data/atlas/documentation-inventory.json),
loaded through `src/lib/documentation-inventory.ts` and reconciled against the
live registry by `src/lib/documentation-inventory.test.ts`. If a layer gains a
link, loses one, or renames a label, that test fails. The tables below are a
reading of the manifest, not a second copy of it.

**Public routes here are proposals.** The Handbook route model is fixed by
KAN-410; this records where each document should land and the reason.

## What the audit found

**Two published layers make a historical or evidential claim with no
documentation whatsoever.** `roman-empire-117` draws an imperial frontier and
`map-coverage` draws what each corpus map depicts; neither carries a single
documentation link. `roman-empire-117` is the more exposed of the two - it is
the frame the Dacia material is read against, and nothing public explains what
"imperial extent" asserts or how the line was drawn.

**One layer is fully covered, and it is the one KAN-413 already calls the gold
standard.** `dacia-treaty-frontiers` has a dedicated source ledger carrying
instruments, interpretation, confidence, the editorial geometry rule and the
rights posture. Every other layer is measured against it.

**The remaining twelve are partial in a consistent way**: their fields are
documented and their evidence is not. The VMN family is the exception, having a
real source log; the Hanseatic family has the apparatus sitting unpublished in
`data/hanseatic/sources/`, and the Dacia family has it in attribution strings.

**The riskiest gap is `dacia-attestations-research`** - an unreviewed research
corpus, published live, whose single documentation link is a 416-line technical
dictionary. The condition that its records may not be cited as established
evidence exists only in the layer description.

**One document is not obsolete but wrongly promoted.** The VMN deep-link guide
is a specification of URL parameters carried as a first-level peer of the source
log on all three VMN layers. Its reader-facing equivalent is the Atlas's own
"Copy this view" affordance (KAN-405), not a page of parameter tables.

**One document already has a public owner.** `docs/dacia/README.md` is linked
from `dacia-attestations` as "Programme", but the programme index shipped as a
site page in KAN-370. The link should resolve there.

**No public flow depends on Confluence today.** One Confluence URL exists
anywhere in the data - a project specification cited by a single provisional HSE
evidence claim - and it does not reach the built output. It is not a live
defect, but it becomes one the moment KAN-414 publishes the HSE sources. The
claim it supports is already marked superseded, so the fix is to retire the
citation rather than to publish the URL.

## Inventory: the nine documents

| Document                                                                                      | Audience         | Public function                                    | Pattern | Proposed route                                           | Layers |
| --------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------- | ------- | -------------------------------------------------------- | ------ |
| `docs/vmn/data-dictionary.md`<br>VMN data dictionary                                          | mixed            | glossary-data-fields, methodology                  | B       | `/atlas/handbook/programmes/vmn/data-fields/`            | 3      |
| `docs/vmn/source-log.md`<br>VMN source log                                                    | public-scholarly | sources-evidence, citation-data-reuse              | A       | `/atlas/handbook/programmes/vmn/sources/`                | 3      |
| `docs/vmn/deep-links.md`<br>VMN essay-Atlas deep-link guide                                   | technical        | technical-gateway                                  | none    | - (technical only)                                       | 3      |
| `docs/hanseatic/data-dictionary.md`<br>HSE data dictionary                                    | mixed            | glossary-data-fields, methodology                  | B       | `/atlas/handbook/programmes/hanseatic/data-fields/`      | 3      |
| `docs/hanseatic/decisions.md`<br>HSE decisions log                                            | mixed            | editorial-decision, methodology                    | B       | `/atlas/handbook/programmes/hanseatic/decisions/`        | 3      |
| `docs/dacia/data-dictionary.md`<br>CCD data dictionary                                        | mixed            | glossary-data-fields, methodology                  | B       | `/atlas/handbook/programmes/dacia/data-fields/`          | 2      |
| `docs/dacia/README.md`<br>Corpus Chartarum Daciae programme README                            | mixed            | layer-explanation, methodology                     | B       | `/programmes/corpus-chartarum-daciae/`                   | 1      |
| `docs/dacia/shared-gis-layers.md`<br>The shared Dacia GIS family                              | public-scholarly | layer-explanation, methodology                     | B       | `/atlas/handbook/methods/dacia-shared-gis/`              | 5      |
| `docs/dacia/treaty-frontier-source-ledger.md`<br>Treaty and frontier source ledger, 1829-1947 | public-scholarly | sources-evidence, methodology, citation-data-reuse | A       | `/atlas/handbook/layers/dacia-treaty-frontiers/sources/` | 1      |

Every document keeps its GitHub link: reproducibility stays reachable, it just
stops being the only way to understand a layer. Mixed documents take Pattern B
rather than Pattern A because their technical half must not travel with them
into the public record.

### Why each classification

**VMN data dictionary** (`docs/vmn/data-dictionary.md`) - Field meanings, controlled vocabularies and temporal conventions are reader-facing; the FGB build contracts and the spec section numbers are not. Pattern B: an authored data-fields record cites the canonical field IDs, and the full dictionary stays reachable under Advanced/Technical.

**VMN source log** (`docs/vmn/source-log.md`) - The historical authorities behind every VMN feature, plus the publication rules. Wholly reader-facing and short enough to render as-is (Pattern A). Feature-level citations already resolve through it, so it must not stay behind a GitHub hop.

**VMN essay-Atlas deep-link guide** (`docs/vmn/deep-links.md`) - A specification of Atlas URL parameters and an anchor validation table. The reader-facing equivalent of this document is the Atlas affordance itself - "Copy this view" (KAN-405) - not a page of parameter tables. Demote from first-level to Advanced/Technical; do not publish.

**HSE data dictionary** (`docs/hanseatic/data-dictionary.md`) - Same split as the VMN dictionary. The participation classes, evidence types and certainty vocabulary are exactly what a reader needs to interpret the map; the compile outputs, promotion rules and release manifest are not.

**HSE decisions log** (`docs/hanseatic/decisions.md`) - Carries genuinely reader-facing editorial reasoning ("Two different fours", "Bruges in the past tense", the vocabulary decisions) interleaved with stable-ID and build-contract governance. Pattern B: publish the curated editorial decisions; the full log stays technical. This document also holds the network-not-territory rationale that KAN-418 requires be publicly legible.

**CCD data dictionary** (`docs/dacia/data-dictionary.md`) - 416 lines, mostly CSV schemas and governance tables. The reader-facing minority - the promotion ladder, the confidence and attestation-class vocabularies, and the two-tier release contract - is what the Atlas facets expose, so it must surface publicly while the schemas stay technical.

**Corpus Chartarum Daciae programme README** (`docs/dacia/README.md`) - The only current link whose public owner already exists: the programme index shipped in KAN-370. The layer should point at that route, not at the README. The README keeps the identifier, immutability and gate-running material as technical documentation.

**The shared Dacia GIS family** (`docs/dacia/shared-gis-layers.md`) - The heaviest reuse in the registry: five layers cite this one document, and four of them are asking it for their own per-layer explanation. Migration must split it into one shared method record (the rule the family is built on, the geometry_provenance contract) plus per-layer records that reference it. Copying the shared prose into five layer pages would create exactly the duplicate scholarly identity KAN-418 forbids.

**Treaty and frontier source ledger, 1829-1947** (`docs/dacia/treaty-frontier-source-ledger.md`) - Frozen instruments, interpretation and confidence, the editorial geometry rule and the rights posture, in reader-facing prose and bound to one layer. This is the gold-standard target for KAN-413: the pattern every other layer is measured against.

## Ownership and destination map

| Document                                     | Canonical owner                                      | Disposition      |
| -------------------------------------------- | ---------------------------------------------------- | ---------------- |
| VMN data dictionary                          | VMN programme (repository Markdown)                  | migrate-public   |
| VMN source log                               | VMN programme (repository Markdown)                  | migrate-public   |
| VMN essay-Atlas deep-link guide              | VMN programme (repository Markdown)                  | retain-technical |
| HSE data dictionary                          | HSE programme (repository Markdown)                  | migrate-public   |
| HSE decisions log                            | HSE programme (repository Markdown)                  | migrate-public   |
| CCD data dictionary                          | CCD programme (repository Markdown)                  | migrate-public   |
| Corpus Chartarum Daciae programme README     | Site: /programmes/corpus-chartarum-daciae/ (KAN-370) | migrate-public   |
| The shared Dacia GIS family                  | CCD programme (repository Markdown)                  | migrate-public   |
| Treaty and frontier source ledger, 1829-1947 | CCD programme (repository Markdown)                  | migrate-public   |

## Shared documents: the duplication hazard

Six of the nine documents are cited by more than one layer. Migrating them
per-layer would create competing owners of one method - exactly the duplicate
scholarly identity the KAN-418 definition of done forbids.

| Document                            | Layers | Hazard                                                                                                                                                                                                                                                                     |
| ----------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/vmn/data-dictionary.md`       | 3      | One dictionary, three layers. The public data-fields record must be programme-scoped, not per-layer.                                                                                                                                                                       |
| `docs/vmn/source-log.md`            | 3      | Programme-scoped source log, additionally cited from the public bibliography. One owner, three referents.                                                                                                                                                                  |
| `docs/vmn/deep-links.md`            | 3      | Repeated across all three VMN layers as a first-level peer link. The duplication is not the main problem here - the promotion is - but it is why the demotion has to happen in one place rather than three.                                                                |
| `docs/hanseatic/data-dictionary.md` | 3      | As the VMN dictionary.                                                                                                                                                                                                                                                     |
| `docs/hanseatic/decisions.md`       | 3      | Programme-scoped decisions; must not be restated per layer.                                                                                                                                                                                                                |
| `docs/dacia/data-dictionary.md`     | 2      | Cited by both CND attestation tiers. The public data-fields record must be programme-scoped and must state the two-tier contract once, so the reviewed and research layers cannot end up explaining the review gate differently.                                           |
| `docs/dacia/shared-gis-layers.md`   | 5      | Five layers cite one document, four of them for their own layer explanation. Naive migration would copy the shared prose into five layer pages and create five competing owners of one method. Split into a single method record plus per-layer records that reference it. |

The worst case is `docs/dacia/shared-gis-layers.md`: five layers cite it, and
four are asking it for their own layer explanation. It must be split into one
shared method record plus per-layer records that reference it.

## Gap list: what each layer owes a reader

A layer that makes a historical or evidential claim owes a reader two things -
an explanation of the claim and a record of the evidence behind it. Context
layers take a minimal-context exemption. `partial` means at least one of the two
is missing.

| Layer                         | Coverage            | Missing                                          | Note                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------- | ------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `map-coverage`                | gap                 | layer-explanation, sources-evidence, methodology | No documentation link of any kind, and it is an evidence layer. A reader cannot currently learn how a depicted extent was derived, what precision it claims, or that it describes the map rather than the ground. Must be closed before first public GIS release.                                                                          |
| `roman-empire-117`            | gap                 | layer-explanation, sources-evidence              | No documentation link of any kind. The layer carries an AWMC/Barrington attribution and an ODbL licence in its record, but nothing explains what "imperial extent" means as a claim, how the frontier was drawn, or how it relates to the Dacia material it frames. The most visible unsourced historical layer in the registry.           |
| `dacia-attestations`          | partial             | sources-evidence, layer-explanation              | Dictionary and programme README are linked; no public evidence record. The layer is also empty pending human review, and nothing public says so - a reader meets an empty layer with no explanation.                                                                                                                                       |
| `dacia-attestations-research` | partial             | sources-evidence, layer-explanation              | Highest-risk gap in the registry: an unreviewed research corpus published live with a single link to a 416-line technical dictionary. The "may not be cited as established evidence" condition exists only in the layer description. It needs a public record stating the review gate, the two-tier contract and the citation restriction. |
| `dacia-josephinian-sheets`    | partial             | sources-evidence                                 | Evidence layer. Needs a public record for the Kriegsarchiv holdings, the reconstructed-footprint caveat and the no-scan-redistributed rights posture; all three currently sit in the attribution string and the shared document.                                                                                                           |
| `dacia-principalities`        | partial             | sources-evidence                                 | As dacia-roman-sites. The Hertslet basis for the phases is in the attribution string, not in a citable record.                                                                                                                                                                                                                             |
| `dacia-roman-network`         | partial             | sources-evidence                                 | As dacia-roman-sites. The editorial-versus-attested distinction is carried by the dash pattern and explained only in the shared document.                                                                                                                                                                                                  |
| `dacia-roman-sites`           | partial             | sources-evidence                                 | The shared GIS family document explains the layer well; the sources behind each identification (Barrington, TIR L-34/L-35) have no public record, and the geometry_provenance contract is only stated in the shared document.                                                                                                              |
| `hanseatic-events`            | partial             | sources-evidence, layer-explanation              | As hanseatic-places. The network-not-territory rationale that KAN-418 requires be publicly legible currently lives only in the decisions log and the essay.                                                                                                                                                                                |
| `hanseatic-places`            | partial             | sources-evidence, layer-explanation              | Data fields and decisions are documented; the sources and per-claim evidence are not public. data/hanseatic/sources/sources.csv and evidence.csv hold exactly the apparatus a reader needs and are currently unpublished.                                                                                                                  |
| `hanseatic-routes`            | partial             | sources-evidence, layer-explanation              | As hanseatic-places. Additionally the evidence_type width scale (documented route / repeated connection / generalized reconstruction) is the layer’s central epistemic claim and is only explained inside the technical dictionary.                                                                                                        |
| `venetian-ports`              | partial             | layer-explanation                                | Sources and data fields are covered by the VMN source log and dictionary. Missing a per-layer explanation of what a port phase asserts and why status drives symbol size.                                                                                                                                                                  |
| `venetian-possessions`        | partial             | layer-explanation                                | Same as venetian-ports. Missing the reader-facing statement about clipping to the coastline and what a phased fill does and does not claim about control.                                                                                                                                                                                  |
| `venetian-routes`             | partial             | layer-explanation                                | Same as venetian-ports. Missing the reader-facing statement that a muda line is a documented convoy relation, not a surveyed track.                                                                                                                                                                                                        |
| `dacia-treaty-frontiers`      | covered             | -                                                | The only fully covered layer: a dedicated source ledger with instruments, interpretation, confidence, geometry rule and rights posture, plus the shared family method. KAN-413 gold standard.                                                                                                                                              |
| `ne-boundaries`               | exempt-with-warning | -                                                | Minimal-context exemption, but conditional: the present-day boundary layer must carry a visible anachronism warning wherever it is drawn over historical material (KAN-402 inspector, KAN-418 step 8). The exemption covers documentation depth, not the warning.                                                                          |
| `ne-coastline`                | exempt              | -                                                | Neutral base geography. Minimal-context exemption: source, licence and attribution on the layer record are sufficient.                                                                                                                                                                                                                     |
| `ne-land`                     | exempt              | -                                                | Neutral base geography. Minimal-context exemption.                                                                                                                                                                                                                                                                                         |
| `ne-rivers`                   | exempt              | -                                                | Neutral base geography. Minimal-context exemption.                                                                                                                                                                                                                                                                                         |

`ne-boundaries` takes the exemption conditionally. Its documentation depth is
adequate; its anachronism warning is not optional, and KAN-402 owes it one
wherever present-day borders are drawn over historical material.

## Links outside the registry

The registry is not the only place the Atlas hands a reader a raw repository
link.

| Location                                  | Audience            | Disposition      | Note                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------- | ------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/bibliography.astro`            | public-scholarly    | migrate-public   | A first-level GitHub link in reader-facing prose on a public page: feature-level citations are told to resolve through it. Repoint to the VMN sources route when it exists.                                                                                                                                                                                                                                                                                      |
| `src/pages/bibliography.astro`            | mixed               | migrate-public   | As above: repoint to the VMN data-fields route, keeping the raw dictionary under Advanced/Technical.                                                                                                                                                                                                                                                                                                                                                             |
| `data/hanseatic/sources/sources.csv`      | internal-governance | internal-only    | The only Confluence URL anywhere in the data or the site. It is a source row cited by one provisional HSE evidence claim (hse-claim-lubeck-leading), and it does not reach the built output today. Not a live public defect - but it becomes one the moment HSE sources are published, which KAN-414 is going to do. The claim it supports is already marked superseded, so the fix is to retire the citation rather than to publish the URL. Guarded by a test. |
| `src/data/dacia/generated/programme.json` | technical           | retain-technical | A link to the released CND 0.1 data tree, surfaced by the public programme index. Legitimately technical: it is the download/reuse gateway, and KAN-416 gives it a proper citation and data-reuse surface. Keep, but present it as Advanced/Technical rather than as documentation.                                                                                                                                                                              |

## Retirements and demotions

Nothing in the inventory is obsolete. Two documents are misfiled rather than
unwanted:

- **VMN essay-Atlas deep-link guide** (`docs/vmn/deep-links.md`) - demote: Not obsolete, but wrongly promoted: three layers carry it as a first-level peer of their source log. Its reader-facing function is served by the Atlas "Copy this view" affordance (KAN-405). Demote to Advanced/Technical on all three VMN layers.

- **Corpus Chartarum Daciae programme README** (`docs/dacia/README.md`) - repoint: Superseded as a public destination by /programmes/corpus-chartarum-daciae/ (KAN-370). The "Programme" link on dacia-attestations should resolve to the site route; the README stays as technical documentation.

## What this hands the downstream tickets

- **KAN-410** gets nine documents with a proposed route and a declared pattern
  to fix the Handbook route model against.
- **KAN-412** gets the Pattern A / Pattern B split: two documents render as
  Markdown, six need authored reader-facing records, one stays technical.
- **KAN-413** gets its gold standard already identified, and the five-layer
  split of the shared Dacia GIS document as its main structural task.
- **KAN-414** gets the HSE sources problem stated: the apparatus exists in
  `data/hanseatic/sources/` and is unpublished, and one of its rows is a
  Confluence URL that must be retired rather than promoted.
- **KAN-416** gets the two documents whose function is citation and data reuse.
- **KAN-418** gets a manifest it can re-run: the reconciliation test is the
  "zero unexplained first-level GitHub/Confluence documentation links" check,
  and the gap list is the "every required published layer has public
  documentation" check.

Two gaps must close before the first public GIS release regardless of
sequencing: `roman-empire-117` and `map-coverage` cannot ship a claim with no
documentation at all.
