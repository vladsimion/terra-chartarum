# CCD data dictionary

## `reference/vocabularies.csv` (KAN-330)

The single source of controlled values. Every categorical field in every Dacia
table is checked against it, so a term only exists once and changing it changes
it everywhere. One row per term: `vocabulary`, `term`, `rank`, `label`,
`definition`, `status`, `use_instead_of`.

`status` is `approved` or `deprecated`. A deprecated term must name a live
replacement, which the compiler resolves - a dangling replacement fails.

Five vocabularies are frozen by KAN-330 and pinned in the validator, so dropping
or renaming a term fails the gate rather than quietly changing what the corpus
can say.

**`attestation_class`** splits in two, and the split is load-bearing. Five
classes record a **name**: `exact`, `variant`, `alternative`, `textual_only`,
`reconstructed`. Five record a **silence**: `extra_muros`, `source_silent`,
`not_applicable`, `survival_unknown`, `mapped_unlabelled`. A silence may not
carry a reading, a script, a language or a coordinate - otherwise an absence
slowly acquires the furniture of a presence.

The two that are constantly confused are `extra_muros` and `source_silent`.
A portolan does not name an inland ruin because its scope is the coastline:
that is `extra_muros`, and it carries no evidential weight. The Hereford map
covers the region and still does not name the place: that is `source_silent`,
and it is a finding. This is why `sources.scope` is required - silence is only
readable against a declared scope.

**`confidence`** runs `direct`, `high`, `medium`, `low`,
`editorial_reconstruction`. It describes how well the claim is supported, not
how certain the editor feels. `editorial_reconstruction` is the project's own
assertion and must never be presented as a source reading.

**`geometry_provenance`** distinguishes `source_geometry`,
`georeferenced_source`, `scholarly_reconstruction`, `editorial_reconstruction`
and `display_generalisation`. The last is never a positional claim.

**`date_precision`** covers `exact_year`, `year_range`, `circa`, `century`,
`terminus_post_quem`, `terminus_ante_quem`, `disputed`, `undated`. `exact_year`
and `circa` require a single year; `year_range` requires two distinct ones;
`undated` may carry neither; `disputed` requires a recorded editorial decision
in `note`.

**`review_state`** is the only ranked vocabulary, and the ranks must be
contiguous from zero: `raw` (0), `normalized` (1), `reviewed` (2), `approved`
(3), `published` (4). Rank is what makes "no further than this" checkable.

Supporting vocabularies - `normalization_method`, `rights_statement`,
`place_type`, `region`, `locator_type`, `script`, `language`,
`evidence_regime`, `selection_axis` - are validated the same way.
`rights_statement` deliberately reuses the Hanseatic terms so the two
programmes clear rights against one bar.

## `reference/vocabulary-examples.csv` (KAN-330)

A worked example per ambiguous term, each naming the term it is most often
confused with. The validator requires every `attestation_class` term to have at
least one, so the taxonomy cannot grow a category nobody can apply.

`grounding` is `trench_a` or `illustrative`. A `trench_a` example cites a real
place or source and those IDs must resolve. An `illustrative` example defines a
boundary the corpus has not yet met and may **not** cite real records - which
stops a constructed example being mistaken for an attested reading.

## The promotion ladder

Shared by places, sources and attestations. A record may sit unfinished for as
long as it likes; the moment it claims to be reviewed, every field the claim
rests on has to be real.

- At `reviewed` or above a record needs a named `reviewer` and an ISO
  `review_date`.
- A reviewed **attestation** additionally needs a real locator: `locator_type`
  may not be `none` and `locator` may not be `pending`.
- `normalization_method: llm_assisted` cannot pass `normalized` without a named
  reviewer. Machine normalisation gets a record into shape and no further.

`pending` means "not yet established", as against an empty field meaning "not
applicable". It is tolerated only while a record is `raw`; promoting a record is
what forces its pending fields to be filled. An unfinished table stays loudly
unfinished instead of quietly looking finished.

Every record currently in the corpus is compiled at `raw` or `normalized` with
`normalization_method: llm_assisted` and no reviewer. Nothing here is published
evidence. The compilation is done (KAN-334/335); the human review is not, and
cannot be done by whatever compiled the rows.

### Promotion is a tool, not a column (KAN-335)

`scripts/dacia/review.py` is how a record moves up the ladder, and its one
important property is that it cannot be used to fake the move:

```bash
python3 scripts/dacia/review.py queue --verbose
```

```bash
python3 scripts/dacia/review.py promote att-0002 --reviewer "Name" --set locator_type=sheet --set 'locator=segm. VIII'
```

Every promotion is written to a scratch copy of the tables, validated with the
ordinary gate, and kept only if the gate passes. A reviewer who has not supplied
a locator, or whose reading was captured from this project's own display rather
than from a witness, gets the refusal and nothing on disk changes.

`queue` computes what is blocking each record by trial-promoting it against the
real validator, so the tool never carries a second copy of the rules that could
drift from the first.

## `places.csv` (KAN-332)

One row per **referent**. `place_id` is a `plc-` slug. `reference_name` is the
name the project uses to talk about the place, not a claim about any source.

`ref_lon` / `ref_lat` are the normalized reference location in EPSG:4326
degrees, checked against a Dacia bounding box - which is what catches a
transposed pair, since a swap stays inside the global range and would otherwise
validate. `ref_geometry_provenance` says where that location came from, and
`modern_reference` is the common case: the living settlement's own coordinates,
which are a reference point rather than a historical claim about anything.

`location_status` (KAN-334) is `located` or `unlocated`. An **unlocated** place
carries no coordinates and no provenance at all, and must record why. This
exists because the pilot deliberately includes Vicina, which is well attested
and whose site is unsettled: publishing one of the candidate positions would
convert an open question into a point on a map, and the schema refuses to let it.

External identifiers (`pleiades_id`, `whg_id`) are optional and gated by
`external_verified`. The rule cuts both ways: `yes` with no identifier fails,
and an identifier with `no` fails. Only identifiers checked against their
provider are published, which is the same discipline as the existing toponym
concordance.

## `sources.csv` (KAN-332)

One row per witness or series. `source_id` is a `src-` slug. `title`, `creator`,
`witness`, `repository`, `citation` and `scope` are all required.

`scope` is what the source set out to cover, and it is load-bearing: it is the
field that separates `extra_muros` from `source_silent`. A source without a
scope cannot support an absence, so the compiler refuses one.

`rights_statement` records the licence of the **work**. It is not a clearance
for any particular reproduction: the Trench A sources are public domain as
works while their witness images remain institutionally held. Reproduction
rights are cleared per image, at the rights gate, not by this column.

`source_family` (KAN-334) classifies the kind of witness - coordinate
catalogue, itinerary, mappa mundi, portolan, regional print, antiquarian
reconstruction, military survey, national survey, digital survey. The pilot has
to argue across evidence regimes rather than pile up one kind of witness, so the
compiler requires at least four distinct families.

`edition_state` and `repository_object_id` are optional while a source is being
compiled and **required before it can be reviewed**. A repository that cannot
state its own object identifier has not really been checked, and the bar is
placed at review rather than at compilation so that unfinished work can still be
recorded honestly.

## `attestations.csv` (KAN-332)

One row per claim that a source does or does not name a place. `place_id` and
`source_id` resolve to the authorities; an unresolved key fails.

`name_original` holds the reading in the witness's own script, with `script` and
`language` beside it. `name_transliterated` is a reading aid and can never stand
in for it - a transliteration without an original fails. Where the original
script has not yet been transcribed, `name_original` is `pending` and the row
stays `raw`; several Ptolemy rows sit there now, because Trench A prints only
Latin transliterations of the Greek.

`source_lon` / `source_lat` are the coordinates the **source itself** gives, and
are deliberately separate from the place's reference location: Ptolemy's numbers
are evidence about Ptolemy, not about where the town is. Both or neither, and
never on a silence.

A duplicate `(place_id, source_id, name_normalized)` triple is rejected. One
source giving a place two names is two rows - the Josephinian sheet prints
Klausenburg and Kolozsvár side by side, and they are separate claims in separate
languages.

`locator_type: whole_work` (KAN-335) is the documented maximum precision for an
indivisible witness - a single-sheet map has no folio to cite. It is not a way
round the locator rule: a reviewed row using it must say why nothing finer
exists.

`last_verified` records when the row was last checked against its source, as
against `review_date` which records when it was first cleared. Approved rows
need both.

## `transcriptions.csv` (KAN-335)

Raw capture, kept in its own table so that normalisation can never quietly
overwrite what the witness carried. One row per reading, holding the `verbatim`
string, where it came from (`capture_source`), when, and by what method.

`capture_method` is the load-bearing column. `from_witness` and `from_edition`
are the two that can support a reviewed attestation; `from_secondary` and
`from_local_display` cannot. Every reading currently in the corpus is
`from_local_display` - captured from this project's own exhibition rather than
from any witness - which is precisely why none of them can be promoted. That is
the migration discipline stated as data: **moving a reading out of Terra
Sigillata does not make it evidence, it only makes it a candidate.**

## `name-uses.csv` and `name-use-edges.csv` (KAN-336)

What a name meant, when, and to whom. A `name_use` pairs a `lexical_form` with a
referent, a period, a `fate_class` and either a source or the institution that
exercised it. The fate classes are `translatio` (the name is carried to another
referent), `restitutio` (restored to one it formerly held), `inventio` (coined
for a referent that never carried it), `applicatio` (applied to a new
administrative entity) and `commercium` (passed into branded use).

**Relationships are rows, never inferences.** `name-use-edges.csv` holds the
links, and the four kinds are `continuity`, `derivation`, `revival` and
`homonym_only`. A `continuity` edge must cite an attestation: a shared string is
not a relationship, and the compiler will not let one become one. A `revival`
must name the instrument that reinstated the name.

`homonym_only` is the edge that does the real work. Roman Dacia and the Dacia of
the Hereford map share a word and nothing else, and the corpus says so in a row
rather than leaving a reader to join them up by eye. A use that shares its form
with another and is joined to none of them fails validation, so every homonym
has to be adjudicated one way or the other.

## `pilot/` (KAN-333)

`trench-a-inventory.csv` gives every Trench A place or source datum a
disposition: `migrate`, `link`, `preserve_local` or `retire`. A `migrate` row
also carries a `migration_state` - `done`, `partial` or `planned` - and the rule
cuts both ways: a `done` target must resolve in its authority table, and a
`planned` target that already exists is stale bookkeeping and fails. An
attestation set additionally counts `migrated_cells` against `cell_count`, and
the state has to agree with the count rather than be asserted beside it.

`local_cells` (KAN-338) counts the cells of a set that are rhetorical rather
than evidential and so will never migrate - stratum 0 of every test pit is the
Present Survey, which stands for continuous digital feeds and is not a witness.
A set is `done` when `migrated_cells + local_cells == cell_count`, and a local
cell without a recorded reason fails, so declaring a cell local is a stated
editorial judgement rather than a way to close a migration quietly. Only an
attestation set may count cells at all.

`pilot-places.csv` is the frozen 40-place pilot; `pilot-manifest.json` records
its version, freeze date, count and SHA-256. Editing the pilot without recording
a new version and hash fails the gate. See
[`trench-a-inventory.md`](./trench-a-inventory.md).

## `release/cnd-0.1/` (KAN-337)

`make dacia` compiles every canonical table to UTF-8 CSV and a Parquet twin,
plus a JSON-LD serialisation and a manifest. Both formats carry every column as
a string: the CSV is canonical and the Parquet mirrors it, because typing the
columns separately would let the two disagree about what an empty cell means.

The manifest records the schema version, the release id and kind, record counts,
attestations by review state, the source families, the SHA-256 of every **input**
as well as every **output**, and the licence summary. Recording input hashes is
what lets `npm run dacia:validate` detect a table edited but never rebuilt, on a
bare python3, without re-reading the Parquet.

### The two tiers

| Asset                                            | Holds                                       |
| ------------------------------------------------ | ------------------------------------------- |
| `public/geo/dacia-attestations.geojson`          | `approved` and `published` records only     |
| `public/geo/dacia-attestations-research.geojson` | everything, with `review_state` per feature |

The public tier is what the Atlas shows by default and is **currently empty**.
That is the correct state, not a bug: an unreviewed row cannot reach a normal
public asset by being compiled.

Each feature also carries `*_label` companions for its coded fields
(`language_label`, `script_label`, `attestation_class_label`,
`confidence_label`), read from `vocabularies.csv` at build time. The filter
panel shows "Ancient Greek" rather than `grc` without the interface having to
carry a second copy of the vocabulary.

`valid_from` is the source's date and `valid_to` is the open-ended sentinel
`9999`. The Atlas slider reveals _through_ a year, and an attestation does not
stop being evidence once its source is finished being made; using the source's
end year would have hidden every record at any cutoff past 1864.

A silence keeps its point on the map, so the absence taxonomy can be styled and
filtered rather than being invisible - which is the Hiatus argument made
renderable. An attestation on an **unlocated** place has nowhere to go and is
reported in the manifest under `unlocatedPlaces` instead of being given a
guessed position.

## `reference/` governance tables (KAN-329, KAN-331)

`programme-ids.csv` and `entity-prefixes.csv` freeze the identifiers; see
[`README.md`](./README.md). `gates.csv`, `trench-gates.csv`, `campaigns.csv` and
`verification-debt.csv` carry the Definition of Done; see
[`definition-of-done.md`](./definition-of-done.md).

## `gis/` shared layers (KAN-341, KAN-342, KAN-343)

Three packages that compile to four Atlas layers: `roman-dacia`,
`principalities` and `josephinian-sheets`. Attributes live in CSV and drawn
geometry in a sibling GeoJSON, joined by id.

The column that carries the argument is `geometry_provenance` (and
`footprint_provenance` on a sheet). Nothing in this family is digitised from a
source sheet, so the validator refuses any row claiming `source_geometry` or
`georeferenced_source`, and each drawn GeoJSON must carry `surveyedGeometry:
false` with a recorded justification. A Roman site authors no coordinates at all

- it names a `place_id` and inherits the corpus's own location and provenance -
  and a road authors none either, being an ordered list of those same places.

A principality phase must begin in the year of the instrument that opened it,
and two phases of one polity may not overlap. A Josephinian sheet's
`covers_place_ids` is recomputed from its footprint at build time rather than
trusted, may not redistribute a scan, and may keep `archive_sheet_id: pending`
only while it is still unreviewed. See
[`shared-gis-layers.md`](./shared-gis-layers.md).

## `reference/nomen-errans-witnesses.csv` (KAN-344)

What Trench C might show, as against what it can argue. One row per candidate
visual witness, each pointing at the `name_use_id` it would illustrate - a
picture with no argument behind it is decoration, and the validator refuses one
whose use does not resolve.

The production bar is the one the other research packages hold: a witness may
only be planned into the page once `rights_status` permits production-wide
reuse, `resolution_status` is `sufficient`, and a repository object identifier
has been transcribed. `repository_object_id` is required on every row, `pending`
if unknown. Nothing currently clears the bar, which is reported in the gate's
readiness lines rather than raised as an error: an essay may be written from
description alone. See [`nomen-errans-ledger.md`](./nomen-errans-ledger.md).

## `generated/hiatus-timeline.json` (KAN-349)

The Hiatus states, their witness families and the absence taxonomy, compiled by
`make dacia` into `src/data/dacia/generated/` and consumed through
`src/lib/hiatus.ts`, so no chronology is written twice.

The taxonomy travels with the states deliberately. A filter built from the
states alone would offer whichever classes some state happens to carry and
quietly redefine the taxonomy as that; all six classes ship, including the four
no state has earned. `isArguable()` restates the compiler's rule where a
component would otherwise render an unearned silence as a finding: a class whose
`evidentialWeight` is `none` is never an argument however well reviewed -
`not_surveyed` says nobody looked - and the classes that can carry weight need
the scope read and the state reviewed.

## Research source ledgers (KAN-348, KAN-351)

`reference/hiatus-witness-families.csv` is one row per candidate evidence
family. `historical_question` and `coverage_scope` define what the witness can
answer; `survival_limitations` records what may be missing;
`silence_assessment` records the later evidential decision. The validator keeps
those concerns separate and refuses `meaningful_silence` until a row is
`reviewed`. `not_applicable` is an explicit result, not a euphemism for silent.

`reference/treaty-frontier-sources.csv` is one row per selected legal source.
`record_type` separates proposals, negotiated lines, final instruments,
implementation instruments, arbitration awards, armistices, and later
reconstructions. An ambiguous or disputed interpretation must name its
alternatives and confidence. `geometry_status` only describes the source's
pre-digitisation state; it cannot assert authoritative geometry.

Both tables require repository, citation/locator, HTTPS source URL, rights
posture, and review status. Rows marked `minimum_set: yes` must exactly match
the IDs and SHA-256 values in `reference/source-ledger-manifest.json`, so a
change requires a dated re-freeze rather than silently altering the research
brief.

## Research packages (KAN-349, KAN-354, KAN-357)

`reference/hiatus-absence-classes.csv` defines six mutually distinct absence
decisions. `reference/hiatus-timeline.csv` joins each dated state to a KAN-348
`witness_id`, repeats `source_family` for direct filtering, and carries a
locator, scope-review flag, review status, and confidence. `not_named`,
`named_elsewhere`, and `extra_muros` require reviewed scope. `source_silent` is
not a timeline value; it remains a separately gated CND attestation class.

`reference/carta-rubra-sources.csv` types every row as `map_witness`,
`statistical_table`, or `diplomatic_context`. Maps carry exact edition/state,
creator, date, scale, repository object ID, citation/locator, rights basis,
resolution, and production role. `derived_from` may resolve only to a
statistical table. `reference/carta-rubra-claims.csv` keeps actor, institution,
descriptive claim, intended territorial argument, support status, locator, and
review status in separate fields.

`reference/borroczyn-seam-sources.csv` separates a `borroczyn_witness`,
`later_reference`, `modern_reference`, and contextual sources. A production
role requires both a production-wide rights status and sufficient resolution.
`reference/borroczyn-seam.geojson` contains one EPSG:4326 editorial research
envelope, version and selection date, basis-source IDs, and an explicit
`completeCityCoverage: false` assertion. Its geometry is not historical source
geometry.

All five tables and the seam GeoJSON are frozen by path, record IDs/count, and
SHA-256 in `reference/research-package-manifest.json`. Any substantive change
requires a dated re-freeze.
