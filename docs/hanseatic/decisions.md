# HSE decisions - KAN-302, KAN-303, KAN-304, KAN-305

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

## KAN-303/304/305 - evidence machinery before evidence

These three tickets are archival research, not engineering. What is committed
here is the apparatus that research fills: `terminology.csv`, `corpus.csv`,
`chronology.csv`, `kontore.csv`, the promotion rules that police them, and a
readiness report. **No object ID, stable URL, rights statement, folio or
Kontor profile has been supplied.** Every such field is `pending`, and the
compiler will not let one be promoted while it stays that way.

The reason is specific. A register of plausible-looking repository IDs and IIIF
URLs would pass every structural check, read as authoritative, and propagate
into published citations - which is worse than an empty table, because nothing
downstream would signal that the provenance was never confirmed. The `pending`
sentinel and the promotion rules exist so the unfinished state is impossible to
mistake for a finished one.

### Logged vocabulary decisions

- **No founding date.** The League formed gradually; `founded_in` is deprecated
  in favour of `disputed`. No single foundation year may be stated as fact.
- **No dissolution.** 1669 is recorded as a _conventional terminus_ only. The
  Hanse was never formally dissolved, so no dissolution event may be asserted.
- **`member_city` is deprecated.** The Hanse kept no membership roll; the term
  imports a modern corporate model. Use `documented_collective_participation`.
- **A Kontor is not a colony.** `colony` and `factory` are deprecated in favour
  of `merchant_compound`: a privileged precinct under _host_ jurisdiction, never
  a territorial possession. This is the distinction KAN-305 asks the data to
  make, so the compiler enforces it rather than leaving it to prose.
- **`unattested` is not doubt.** It records that no page-level witness exists in
  _this project's_ corpus yet. Stralsund 1370 and the 1669 terminus are carried
  from the ticket text and sit `unattested` until a witness is entered.

## KAN-307/309 - deterministic compile and the release manifest

- **The build adopts the VMN venv; nothing else does.** FlatGeobuf output needs
  pyogrio, so `make hanseatic` now runs the venv python. `hanseatic-validate`
  and `hanseatic-test` stay standard-library only, which keeps the CI gate and
  the test harness free of GDAL.
- **The manifest carries no timestamp.** Identical inputs must produce an
  identical manifest, so the only thing that can move a hash is the data. It
  records input hashes as well as output hashes, which is what lets validation
  detect an uncompiled source edit without re-reading the binary.
- **FlatGeobuf is reproducible only for a fixed output path.** GDAL embeds the
  layer name it derives from the filename, so writing the same features to two
  different paths yields two different files. The build always writes to the
  one path, and rebuilds are byte-identical.
- **Temporal exceptions are decisions, not tolerances.** A corridor running
  outside its endpoints' phases fails unless `temporal-exceptions.csv` records
  why. The current entry covers the Lübeck-Visby fixture, whose corridor opens
  in 1161 against a Lübeck phase opening in 1358: two provisional fixture dates,
  not a claim that traffic preceded the city's role. KAN-306 and KAN-308 must
  re-derive both bounds and then remove or restate that row.

### Open at hand-off

The readiness report (printed by `npm run hanseatic:validate`) is the running
score. At the time of writing: 0 of 8 rights-cleared witnesses, 0 of 4 Kontor
profiles, and no high-importance claim yet resting on a page or folio. The
"every essay section has a witness" criterion cannot be computed until KAN-312
fixes the section anchors.
