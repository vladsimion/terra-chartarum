# HSE decisions - KAN-302

## Frozen editorial contract

- Title: **The League That Left No Map**
- Subtitle: **The Hanseatic League and the Geography of Privilege**
- Slug: `the-league-that-left-no-map`
- Scope: AD 1150–1669
- Primary room: `road`
- Secondary rooms: `city`, `archive`
- Project prefix: `HSE`
- Epic planning ID: `HSE-E1` / Jira `KAN-295`
- Vertical-slice planning ID: `HSE-1` / Jira `KAN-302`

## Existing contracts inspected

- Native essays use the content schema in `src/content/config.ts`, require a
  canonical room and release date, and remain held with `releaseAt: 2099-01-01`.
- Catalogue records are map-specific and rights-bearing; the Phase 0 fixture
  does not create provisional catalogue objects before KAN-303 confirms corpus
  and rights.
- Atlas layers are Zod-validated in `src/lib/geo.ts`, content-addressed through
  the geo release manifest, and filtered by inclusive `valid_from`/`valid_to`.
- The VMN pattern keeps authority tables, traced geometry, generated browser
  assets and prose projections separate. HSE follows that pattern without
  taking on VMN's FlatGeobuf dependencies during the spike.
- Shared Atlas state already owns `year` and `layers`; KAN-302 adds the generic
  stable `feature` parameter while retaining VMN's port/route/territory aliases.

## Stable IDs

- Place phase: `hse-place-<place>-<role>-<valid-from>`
- Corridor: `hse-route-<from>-<to>`
- Claim: `hse-claim-<subject>-<claim>`
- Source: `hse-src-<short-name>`

`place_id` remains stable across phases; `id` identifies one dated phase. IDs
are lowercase ASCII slugs and are never derived from mutable display names.

## Source and build contract

The frozen Phase 0 authority tables are `places.csv`, `routes.csv`,
`sources.csv`, and `evidence.csv`. Route geometry lives separately in
`traced/routes-paths.geojson`. The compiler joins them and emits distinct Atlas
and MDX projections; prose must not duplicate dates or geometry.

The sample profile deep-links to:

```text
/atlas?year=1358&layers=hanseatic-places&feature=hse-place-lubeck-leading-1358
```

`feature` is the stable generated-feature `id`. The layer remains explicit so a
feature identifier never has to be globally unique across unrelated datasets.

## Vertical-slice boundary

The Lübeck and Visby rows, Lübeck–Visby corridor and one provisional evidence
row are engineering fixtures. They demonstrate joins, validation, temporal
filtering, Atlas focus and MDX reuse; they are not a reviewed historical release.
