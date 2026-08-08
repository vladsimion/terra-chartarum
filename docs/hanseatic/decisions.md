# HSE decisions - KAN-302 through KAN-309

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

The authority tables include `places.csv`, `routes.csv`, `commodities.csv`,
`route_commodities.csv`, `events.csv`, `sources.csv` and `evidence.csv`. Route
geometry lives separately in `traced/routes-paths.geojson`. The compiler joins
them and emits distinct Atlas and essay projections; prose must not duplicate
dates or geometry.

The sample profile deep-links to:

```text
/atlas?year=1356&layers=hanseatic-places&feature=hse-place-lubeck-leading-1356
```

`feature` is the stable generated-feature `id`. The layer remains explicit so a
feature identifier never has to be globally unique across unrelated datasets.

## Superseded vertical-slice boundary

KAN-302 began with Lübeck and Visby rows and one Lübeck–Visby corridor as
engineering fixtures. KAN-306/307/308 replace that count contract with the
production datasets described below. The original low-importance specification
claim remains in the ledger as provenance for the engineering contract, not as
historical evidence.

## KAN-303/304/305 - completed research pass

The first corpus, chronology and Kontor research pass was completed on
2026-08-08. The implementation keeps the original promotion model - `pending`
still means research has not established a value - but the release-facing rows
now carry repository identifiers, page or folio locators, rights decisions and
reviewed profiles.

Two sources carry most of the new historical argument:

- Justyna Wubs-Mrozewicz’s peer-reviewed introduction supplies the chronology’s
  institutional interpretations and the warning against foundation,
  replacement and dissolution moments.
- The 2017 UNESCO Memory of the World nomination dossier identifies the primary
  documents, repository shelfmarks and page-level context for the four Kontore,
  the Peace of Stralsund and the surviving Diet record.

The compiler now treats chronology events as evidence targets, requires every
verified corpus object to name at least one frozen essay section, and reports
coverage across all nine planned sections. These are release contracts rather
than informal checklist items.

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
  make, so the compiler enforces it rather than leaving it to prose. UNESCO’s
  Bryggen description uses “foreign colony” and “quasi-extraterritoriality”; the
  profile preserves the evidence for internal autonomy but rejects “colony” as
  sovereignty shorthand because Norwegian Crown privilege remained the basis.
- **A documentary window is not the life of an institution.** The dates on each
  Kontor row describe the phase supported by its chosen primary witness. London
  1554 and Bruges 1458 are not foundation dates; Bergen 1761 is the departure
  of the last secretary, not dissolution of the wider Hanse.
- **The first Hansetag stays disputed.** Wubs-Mrozewicz uses 1356 for the start
  of regular Diets, while the UNESCO dossier describes the copied Rezess series
  as beginning in 1361. The ledger records a 1356–1361 evidence window rather
  than picking a false single first.
- **Stralsund is dated but its meaning is qualified.** The treaty is securely
  dated 24 May 1370. Calling it the high point of the whole Hanse remains an
  interpretation because the Cologne Confederation only partly overlapped with
  the wider association.
- **Decline is not a single curve.** The 1554–1669 phase brackets institutional
  reorganisation and the last general Diet. It does not erase sixteenth-century
  economic strength or the collective action of Lübeck, Hamburg and Bremen
  after 1669.
- **`place_id` is a gazetteer join.** KAN-305 supplies everything rendered by
  `KontorProfile`; the four host-place joins remain `pending` until KAN-306
  creates those place rows. A profile may be reviewed without expanding the
  vertical-slice gazetteer out of sequence.

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

### Two different fours - do not conflate them

The Civitates plates attest **two separate groups of four**, and they are not the
same four:

- The **London** plate says the Hanse "habet ea quatuor Emporia, Cuntores quidam
  vocant" - four _Kontore_, the overseas establishments: Novgorod, Bergen,
  London, Bruges.
- The **Köln** plate says Köln is reckoned "inter quatuor praecipuas" of the
  "Hanseatico foedere septuaginta duarum civitatum" - four _principal cities_
  within a league of seventy-two, which is the quarter structure, not the
  Kontore.

An essay sentence that says "the four" without saying which is wrong half the
time. Any claim about "four" must name whether it means Kontore or principal
cities, and cite the plate that attests that sense.

The Köln plate also supplies a contemporary printed figure for the league's
size - seventy-two cities - which KAN-306 should weigh against modern estimates
rather than adopt.

### Bruges in the past tense

The Bruges plate closes "florentissimum quondam emporium fuit": it _once was_ a
most flourishing emporium. A source printed in 1593 already places the city's
commercial primacy in the past, which supports the decline narrative without
anyone having to assert a date for it. Filed as evidence against the Bruges
Kontor.

### Verification outcome

The readiness report (printed by `npm run hanseatic:validate`) is the running
score. The corpus stands at **8 rights-cleared witnesses**, 1 hero and 2
fallbacks, no unresolved P0, and **9 of 9 planned essay sections covered**. The
claim ledger carries **15 high-importance claims**, all with page or folio
locators. All six chronology rows and all four Kontor dossiers are reviewed.

The section IDs are frozen from the approved essay specification even though
KAN-312 still owns the MDX draft. This records witness coverage without pulling
essay writing into the research tickets.

Two things the verification pass established that are worth keeping:

- **The blocker is licensing, not discoverability.** Holding repositories were
  found readily. What stopped rows was terms: Bergen's record asserts copyright
  on a 1590 engraving, the Holbein is CC BY-NC-SA, and the one privilege charter
  found was CC BY-NC-ND. Restrictive licences are named exactly in
  `rights_statement` so the register can say what clearing each would take.
- **One volume carries most of the corpus.** Six of the eight rights-cleared witnesses are
  plates in Heidelberg's Civitates Orbis Terrarum vol. 1, all under one
  shelfmark and one Public Domain Mark. That concentration is a risk worth
  stating: a single repository outage or rights change moves six rows at once.
  It is also why the London plate matters twice over, since its STILLIARDS text
  block is documentary evidence and not only a view.

The Second Novgorod Schra, Bergen court books, London by-laws and Bruges
charters are now
identified to repository and shelfmark, but remain `reference_only` because the
UNESCO dossier records copyright in the first three holding archives. The
Bruges charter group is recorded as public domain, but remains `reference_only`
until a direct repository surrogate is secured. Bergen’s Scholeus view and the
Holbein remain separate rights questions and are not promoted.

## KAN-306/307/308 - production gazetteer and network data

The Phase 0 count guard has been replaced by the production contracts: 45–65
distinct places, 60–90 dated role phases, 6–10 corridors and 6–10 commodity
families. The first release contains 60 places/phases, seven corridors, ten
commodity families, 22 normalized route joins and 16 institutional events.

- **Phase dates are not membership dates.** The many 1356–1669 rows are an
  editorial visualization window from the regular-Diet record to the
  conventional terminus. Place notes say this explicitly. More specific bounds
  are used only where the selected documentary evidence supports them.
- **City selection and coordinates have different authorities.** The open
  Marczinek–Maurer–Rauch data and article anchor the research-city universe;
  modern urban-focus coordinates are checked against GeoNames. Historical,
  modern and display names remain separate fields.
- **The four Kontore now join to places.** Novgorod, Bergen, London and Bruges
  resolve to gazetteer rows, closing the temporary KAN-305 `pending` allowance.
- **All route lines are intentionally generalized.** The geometry connects
  documented urban focuses and waypoints. It never claims to recover an
  individual voyage, surveyed channel or precise road alignment.
- **Commodities are qualitative and normalized.** The pipe-separated route
  field is a display projection of `route_commodities.csv`. The compiler checks
  the two representations for exact agreement. No volume field exists.
- **The Sound Toll is not projected backward.** The Marczinek paper's flow data
  begin after the medieval/early-modern phases used by several corridors and
  omit important same-side connections. It supports identifiers and later
  network context, never fabricated medieval quantities.
- **Events model institutional action, not an institutional state.** Privileges,
  ordinances, embargoes, conflict, peace, Diets, relocations, closures and
  afterlives are distinct event types. The 1388 Flanders ordinance is recorded
  together with Lambert and Sicking's evidence that it was repeatedly evaded.
- **Every publication row needs evidence.** A valid source key is necessary but
  no longer sufficient: each place phase, corridor, commodity, normalized join
  and event must also be the target of an evidence-ledger claim.
