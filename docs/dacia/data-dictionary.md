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

Every record currently in the corpus is seeded from Trench A at `raw` or
`normalized` with `normalization_method: llm_assisted` and no reviewer. Nothing
here is published evidence yet; KAN-334 and KAN-335 do the transcription and the
human review.

## `places.csv` (KAN-332)

One row per **referent**. `place_id` is a `plc-` slug. `reference_name` is the
name the project uses to talk about the place, not a claim about any source.

`ref_lon` / `ref_lat` are the normalized reference location in EPSG:4326
degrees, checked against a Dacia bounding box - which is what catches a
transposed pair, since a swap stays inside the global range and would otherwise
validate. `ref_geometry_provenance` says where that location came from.

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

## `pilot/` (KAN-333)

`trench-a-inventory.csv` gives every Trench A place or source datum a
disposition: `migrate`, `link`, `preserve_local` or `retire`. A `migrate` row
also carries a `migration_state` - `done`, `partial` or `planned` - and the rule
cuts both ways: a `done` target must resolve in its authority table, and a
`planned` target that already exists is stale bookkeeping and fails.

`pilot-places.csv` is the frozen 40-place pilot; `pilot-manifest.json` records
its version, freeze date, count and SHA-256. Editing the pilot without recording
a new version and hash fails the gate. See
[`trench-a-inventory.md`](./trench-a-inventory.md).

## `reference/` governance tables (KAN-329, KAN-331)

`programme-ids.csv` and `entity-prefixes.csv` freeze the identifiers; see
[`README.md`](./README.md). `gates.csv`, `trench-gates.csv`, `campaigns.csv` and
`verification-debt.csv` carry the Definition of Done; see
[`definition-of-done.md`](./definition-of-done.md).
