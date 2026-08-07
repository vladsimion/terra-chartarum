# HSE data dictionary

## `places.csv`

One row per dated place/status phase. `id` is phase-specific; `place_id` persists
across phases. `valid_from` and `valid_to` are inclusive integer years.
Coordinates are modern WGS84 longitude/latitude for the relevant urban focus.

Controlled values in this slice:

- `role`: `leading_city`, `market`
- `participation_class`: `documented_collective_participation`,
  `commercial_association_only`
- `certainty`: `high`, `medium`, `low`

## `routes.csv`

One row per generalized corridor. `from_place_id`, `to_place_id` and ordered
`waypoints` resolve to stable `place_id` values. `commodities` is a pipe-separated
set. Geometry is joined from `traced/routes-paths.geojson` by `id`.

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

Two rules are load-bearing. `provenance_class: dealer` may only ever be
`reference_only`, so a dealer listing cannot become a published witness. And
`verification_status: verified` requires a real repository, object ID, stable
URL, resolution, attribution, verification date and an open rights statement -
so "verified" cannot be asserted over unfilled provenance.

## `chronology.csv` (KAN-304)

One row per institutional or chronological event. `date_type` is `year`,
`year_range`, `circa`, `disputed` or `open`; `open` and `disputed` rows may leave
`year_from`/`year_to` pending, and any other type must supply both. A `disputed`
row must carry an `editorial_decision` recording the conflict. Once a row leaves
`provisional` it must cite a `claim_id` in `evidence.csv` and can no longer keep
its years open.

## `kontore.csv` (KAN-305)

One row per Kontor phase, keyed `hse-kontor-<kontor>`. `legal_status` is checked
against the `association` vocabulary, where `colony` is deprecated in favour of
`merchant_compound`. `primary_witness` resolves to `corpus.csv`; `place_id`
resolves to `places.csv` once the gazetteer exists (KAN-306). Compiled to
`src/data/hanseatic/generated/kontore.json` for `KontorProfile.astro`, which
renders a pending field as "Not yet established" rather than printing it.
