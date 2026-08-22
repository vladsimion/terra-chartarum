# Trench A inventory and the frozen pilot

KAN-333 does two things: it gives every place and source datum inside Terra
Sigillata a migration disposition, and it freezes the 40-place pilot that the
bulk transcription will run against.

## The inventory

[`trench-a-inventory.csv`](../../data/dacia/pilot/trench-a-inventory.csv) holds
29 rows covering everything in `public/embed/dacia/index.html` that carries
place or source evidence, plus the interpretive apparatus that deliberately
stays where it is.

| Disposition      | Rows | What it means                                         |
| ---------------- | ---- | ----------------------------------------------------- |
| `migrate`        | 21   | The record moves into CND and the exhibition reads it |
| `link`           | 1    | Stays where it is and gains a corpus reference        |
| `preserve_local` | 6    | Interpretive or presentational; not corpus evidence   |
| `retire`         | 1    | Superseded by CND records                             |

The exhibition turns out to carry a source authority already: each of the
thirteen stelae records creator, date, witness, repository and survival inline.
Twelve are now in `sources.csv`. The thirteenth, "The Present Survey", stays
local: it is a rhetorical stratum standing for continuous digital feeds, not a
discrete witness.

The Secret Century was the last of the twelve to migrate (KAN-338), and it
migrated as **one series record**, not as a sheet. `planurile directoare de
tragere` is some 2,118 sheets at 1:20,000 continued under two later projections;
the dictionary already allows a row per witness _or series_, and the sheet a
reading came from belongs in the attestation's `locator`, where `locator_type:
sheet` says which kind of locator is owed. Modelling the series as a source and
its sheets as locators keeps one scope statement - which is what makes a silence
readable - instead of scattering it across two thousand rows nobody will write.

The four Sondaje test pits hold 52 name cells between them, thirteen per pit -
one per stratum. These are attestation-shaped already: each cell is a place, a
source, a reading or a silence, a language set and an editorial note. All four
sets are now `done`: twelve cells each migrated, and the thirteenth declared
local.

### Cells that never migrate

Stratum 0 of every pit is the Present Survey, and it is not a witness. Counting
it as outstanding work would leave all four sets permanently `partial` and hide
the real remainder, so the inventory carries a `local_cells` column and a set is
finished when every cell is either migrated or declared local. The validator
enforces the arithmetic - `migrated_cells + local_cells == cell_count` for
`done` - and refuses a local cell that gives no reason, which is what keeps the
column from becoming a way to close a migration by declaring the awkward cells
out of scope.

### What the inventory found

**The Sarmizegetusa pit conflates two places.** The exhibition says so in its
own note - the Dacian royal seat in the Orăștie Mountains and the Roman colonia
in Hațeg country are forty kilometres apart - and then runs one pit over both.
The cells divide by what each source actually names: Ptolemy's royal seat and
Ortelius's restored _Zarmizegethusa regia_ belong to
`plc-sarmizegetusa-regia`; the Peutinger road station, the Honterus impression
and the Wallachian and portolan silences belong to
`plc-ulpia-traiana-sarmizegetusa`. This is the case that motivates the rule
that a place record is one referent and never one name.

**The toponym concordance inherited the same conflation.** The
`sarmizegetusa` entry in `src/lib/toponyms.ts` carried Regia's coordinates while
listing both `Sarmizegetusa Regia` and `Ulpia Traiana Sarmizegetusa` as ancient
names of one place - which put the colonia's pin on the wrong mountain. KAN-339
retired it for two entries, `sarmizegetusa-regia` and
`ulpia-traiana-sarmizegetusa`, each carrying a `cndPlaceId` back to its corpus
record. That identifier is deliberately not an authority match: it is the
project citing its own corpus, and the Linked Places export must not dress that
up as external reconciliation.
The `napoca` entry is sound and is marked `link` - it stays as the Atlas overlay
source and gains a corpus reference.

**No locator survives anywhere.** Every stela names a repository; none names a
page, folio or sheet. This is why Trench A's research gate is `partial` and why
the seeded attestations sit at `review_state: raw` with a pending locator. The
Secret Century rows are the one place where the _kind_ of locator is known
without the value - a series is cited by sheet - so they carry
`locator_type: sheet` with `locator: pending`, which is legal only while the row
stays raw.

**Nothing is reproduced.** All thirteen plates are authored SVG; the file
contains no `<img>` tag and no third-party image URL. That is why the rights
gate passes, and why the Five Seals, Six Readings, vignettes, hall grouping and
stratum depths are all `preserve_local`: they are the trench's own instruments
and illustrations, offered to be argued with, not evidence anyone else should
cite.

## The pilot

[`pilot-places.csv`](../../data/dacia/pilot/pilot-places.csv) is a deliberately
mixed selection of 40 places, chosen to span evidence regimes rather than to be
representative of any one.

Coverage, checked by the validator rather than asserted here - every required
axis must be carried by at least one place:

| Axis               | Places |
| ------------------ | ------ |
| `name_variation`   | 25     |
| `medieval_textual` | 24     |
| `transylvanian`    | 15     |
| `roman_centre`     | 10     |
| `wallachian`       | 10     |
| `frontier_site`    | 8      |
| `danube_crossing`  | 7      |
| `black_sea`        | 7      |
| `moldavian`        | 5      |

By region: Transylvania 15, Muntenia 6, Dobrogea 5, Moldavia 5, Oltenia 4,
Banat 4, Crișana 1.

The selection is built to stress the schema, not to flatter it:

- **Roman centres with continuous occupation** (Apulum, Napoca, Potaissa) test
  naming discontinuity under settlement continuity.
- **Sites known chiefly through excavation** (Porolissum, Micia, Bologa,
  Arcidava) test places with strong epigraphic and no cartographic evidence.
- **Danube crossings** (Drobeta, Sucidava, Dierna, Giurgiu, Brăila, Isaccea,
  Chilia) sit on the boundary of every source's scope, which is where
  `extra_muros` and `source_silent` are hardest to tell apart.
- **Saxon and Hungarian Transylvania** (Sibiu, Brașov, Sighișoara, Bistrița,
  Mediaș, Hunedoara, Oradea, Timișoara) carry three or four parallel names each
  across four record traditions.
- **Vicina** is the control case: well attested in the portolans and the
  chronicles, and unlocated. A gazetteer that cannot hold it is not finished.

All four Trench A test pits are in the pilot, as five place records - none is
deferred.

### The freeze

[`pilot-manifest.json`](../../data/dacia/pilot/pilot-manifest.json) records
`cnd-pilot-1.0`, frozen 2026-08-09, 40 places, and the SHA-256 of the CSV. The
validator recomputes that hash on every run, so editing the pilot after the
freeze fails the gate until a new version and hash are recorded.

This is what "frozen before bulk transcription begins" has to mean in practice:
not that the list can never change, but that changing it is an event with a
version number rather than a diff nobody notices.

## Reading the corpus back (KAN-339)

Terra Sigillata is a native essay, and its stones and pits were the corpus
before there was one. Now that they have migrated, the essay reads them back
rather than restating them: `scripts/dacia/build.py` compiles
[`src/data/dacia/generated/trench-a.json`](../../src/data/dacia/generated/trench-a.json)
from the migration inventory, and `<CorpusRef>` renders one line per stone and
per pit from it.

Nothing in the essay names a CND identifier by hand. That is the point: a second
hand-maintained copy of the migration would drift from the first, and the
drift would be invisible - the essay would go on citing a record that had been
renamed or a count that had changed. Adding an attestation now changes what the
essay says about that pit on the next `make dacia`, and a stone whose source has
not migrated renders nothing rather than a stale claim.

Three details are decisions rather than defaults:

- **The links point at the research tier.** CND 0.1 is a pilot and its public
  layer is empty by design, so a link to the reviewed layer would open an empty
  map. The essay links where the records actually are, to the layer that says on
  its face that they are not yet evidence.
- **Silences are counted as records.** "12 records, 6 of them silences" is the
  honest tally for a pit whose argument is largely about what the sheets decline
  to name; reporting six would describe a different corpus.
- **The bridge carries the local data too.** A reader looking for the thirteenth
  stela finds it named as local and non-canonical, with its reason, rather than
  finding it silently absent.

The pit-to-place link is a row, not an inference: each attestation set names the
places it attests in the inventory's `target_id`, and the validator resolves
them against the place authority and the frozen pilot. Deriving it from
transcription capture strings would have worked until the first silence, which
has no transcription to derive from.
