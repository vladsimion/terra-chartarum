# HSE data dictionary

## `places.csv`

One row per dated place/status phase. `id` is phase-specific; `place_id` persists
across phases. `valid_from` and `valid_to` are inclusive integer years.
Coordinates are modern WGS84 longitude/latitude for the relevant urban focus.

Controlled values in the production gazetteer:

- `role`: `leading_city`, `active_city`, `represented_city`,
  `associated_town`, `kontor`, `foreign_branch`, `market`, `fair`, `entrepot`
- `participation_class`: `documented_collective_participation`,
  `documented_regional_participation`, `represented_through_another_city`,
  `commercial_association_only`, `disputed_or_late_attribution`
- `certainty`: `high`, `medium`, `low`

The broad 1356–1669 rows are publication phases bounded by the regular-Diet
record and the conventional terminus. They are not membership intervals. More
specific documentary phases replace that window where the selected evidence
supports them, especially at the four Kontore and in the Zuiderzee/IJssel group.

## `routes.csv`

One row per generalized corridor. `from_place_id`, `to_place_id` and ordered
`waypoints` resolve to stable `place_id` values. `commodities` is a pipe-separated
set. Geometry is joined from `traced/routes-paths.geojson` by `id`.

Every waypoint resolves to `places.csv`, and the first and last waypoint must
equal the route endpoints. `evidence_type` distinguishes `documented_route`,
`repeated_commercial_connection` and `generalized_reconstruction`; it is a claim
about evidentiary strength, not cartographic precision.

## `commodities.csv` and `route_commodities.csv`

`commodities.csv` defines 6–10 qualitative commodity families. The normalized
join table carries a stable row ID, route and commodity foreign keys,
directionality, certainty, source and note. `routes.commodities` is only a
pipe-separated presentation projection and must exactly match the normalized
joins. There is deliberately no volume field: the source base does not support
comparable traffic quantities across the medieval phases.

## `events.csv`

One row per mapped institutional event. Types cover privilege grants,
confirmations and restrictions, Kontor rules, embargoes, conflicts, peace
treaties, Hansetage, Kontor relocations and closures, and institutional
afterlives. Events join to a gazetteer `place_id`; compiled GeoJSON uses that
place's modern urban-focus point while retaining the event's own temporal span.

## `sources.csv` and `evidence.csv`

Every feature resolves to a source key. Evidence rows resolve a claim to both a
feature and source, carry a page/folio or named section locator, and declare a
review status. `provisional` fixtures cannot be treated as publication-ready
historical evidence.

`locator_type` is one of `page`, `folio`, `section`, `none`, and `importance` is
`high`, `medium` or `low`. A `high` claim cannot reach `review_status: approved`
on anything looser than a page or folio, and no approved claim may cite a source
whose `source_type` is `project_specification` - the project's own planning
documents are not historical evidence.

Every publication row in places, routes, commodities, route-commodity joins and
events must also be the target of at least one evidence claim. A source foreign
key alone is not enough to pass validation.

## `pending` and the promotion rules

Research fields are seeded with the literal value `pending`, which means "not yet
established" rather than "empty". The compiler tolerates `pending` only while the
row is still `provisional` (or, in the corpus, `unverified`); promoting a row is
what forces every field it depends on to be real. This is deliberate: an
unfinished table stays loudly unfinished instead of quietly looking finished.

## `terminology.csv` (KAN-304)

The approved vocabulary, one row per term, in four categories: `participation`,
`representation`, `association` and `uncertainty`. `status` is `approved` or
`deprecated`; a deprecated term must name its replacement in `use_instead_of`,
and the compiler rejects it by name wherever a term is expected. This is the
single source of controlled vocabulary - `places.participation_class` and
`kontore.legal_status` are both checked against it.

## `corpus.csv` (KAN-303)

One row per witness object, keyed `hse-obj-<short-name>`. Carries repository,
`repository_id`, `stable_url`, `iiif_manifest`, `resolution`, `rights_statement`,
`attribution` and `corpus_role` (`hero`, `fallback`, `section_witness`,
`reference_only`).

`essay_section` is a pipe-separated set drawn from the nine frozen section IDs
in `scripts/hanseatic/build.py`. A verified witness must name at least one
section, unknown IDs fail validation, and readiness reports the union of
rights-cleared coverage. This makes “every planned essay section has a witness”
an enforceable release condition rather than a prose checklist.

Two rules are load-bearing. `provenance_class: dealer` may only ever be
`reference_only`, so a dealer listing cannot become a published witness. And
`verification_status: verified` requires a real repository, object ID, stable
URL, resolution, attribution, verification date and an open rights statement -
so "verified" cannot be asserted over unfilled provenance.

`rights_statement` records the licence exactly. `public_domain`, `cc0`, `cc_by`
and `cc_by_sa` clear the bar; `cc_by_nc`, `cc_by_nc_sa`, `cc_by_nc_nd` and
`cc_by_nd` do not, and neither do `in_copyright` or `rights_unknown`. The
restrictive Creative Commons terms are named rather than flattened into
`in_copyright` because a register that cannot say _which_ restriction applies
cannot tell you what it would take to clear it - but naming one never softens
the bar it fails.

In practice the restrictive licences are the common case: verification so far
has found holding repositories readily enough, and been stopped by their terms.

`resolution` accepts a third value, `not_published`, meaning the repository was
checked and states no pixel figure - common where a tiled viewer serves the
master. That is a finding, where `pending` is the absence of one, so a verified
row may carry it and a `pending` one still may not. **Only `resolution` accepts
it**: a repository that cannot state its own identifier, URL or attribution has
not really been checked, and the compiler rejects `not_published` in those
fields by name.

## `chronology.csv` (KAN-304)

One row per institutional or chronological event. `date_type` is `year`,
`year_range`, `circa`, `disputed` or `open`; `open` and `disputed` rows may leave
`year_from`/`year_to` pending, and any other type must supply both. A `disputed`
row must carry an `editorial_decision` recording the conflict. Once a row leaves
`provisional` it must cite a `claim_id` in `evidence.csv` and can no longer keep
its years open.

Chronology event IDs are valid `evidence.feature_id` targets, alongside places,
routes and Kontore. This lets the page-level witness attach to the event whose
date or interpretation it supports instead of being filed against an unrelated
map feature.

## `temporal-exceptions.csv` (KAN-309)

A corridor may not run outside the recorded phases of the places it connects.
The mismatch is allowed, but only as a logged decision: one row per accepted
case, carrying `subject_id`, `kind`, a `decision` stating why it is accepted,
and `logged_in` pointing at a document under `docs/`.

The rule cuts both ways. An undocumented mismatch fails the build, and so does
an exception whose mismatch no longer exists - stale bookkeeping is as much a
defect as a missing entry.

## Compiled outputs and the release manifest (KAN-307 / KAN-309)

`npm run hanseatic:build` writes:

| Output                                          | Purpose                       |
| ----------------------------------------------- | ----------------------------- |
| `public/geo/hanseatic-places.geojson`           | Atlas layer                   |
| `public/geo/hanseatic-routes.geojson`           | Atlas layer                   |
| `public/geo/hanseatic-events.geojson`           | Institutional events layer    |
| `public/geo/hanseatic-places.fgb`               | FlatGeobuf twin for GIS reuse |
| `src/data/hanseatic/generated/places.json`      | MDX place profiles            |
| `src/data/hanseatic/generated/routes.json`      | Routes with normalized joins  |
| `src/data/hanseatic/generated/commodities.json` | Commodity reference data      |
| `src/data/hanseatic/generated/events.json`      | Essay event payload           |
| `src/data/hanseatic/generated/kontore.json`     | `KontorProfile` payload       |
| `src/data/hanseatic/generated/manifest.json`    | Release manifest              |

The manifest records `schemaVersion`, a `release` id, the SHA-256 of every
**input**, and the SHA-256, byte length and feature count of every **output**.
It is deliberately timestamp-free, so identical inputs produce an identical
manifest and the only thing that can move a hash is the data.

Recording input hashes is what lets `npm run hanseatic:validate` detect a
source edit that was never compiled, using the standard library alone - it
never has to re-read the FlatGeobuf. Only the build needs GDAL, via the VMN
venv; validation and the tests run on a bare `python3`.

Coordinates are checked as EPSG:4326 degrees inside an HSE bounding box, which
is what catches a transposed longitude/latitude pair - a swap stays inside the
global range and would otherwise validate. Phases of one place may abut but
never overlap.

## `kontore.csv` (KAN-305)

One row per Kontor phase, keyed `hse-kontor-<kontor>`. `legal_status` is checked
against the `association` vocabulary, where `colony` is deprecated in favour of
`merchant_compound`. `primary_witness` resolves to `corpus.csv`; `place_id`
resolves to `places.csv` once the gazetteer exists (KAN-306). Compiled to
`src/data/hanseatic/generated/kontore.json` for `KontorProfile.astro`, which
renders a pending field as "Not yet established" rather than printing it.

KAN-306 closes the temporary `pending` allowance for `place_id`: every reviewed
Kontor now resolves to its host in the gazetteer. Every rendered field - dates,
phase, setting, regulations, commodities, witness and summary - must likewise be
complete before review.
