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
Ten migrate directly into `sources.csv`. Szathmári and the Secret Century are
recorded as `planned` - the Secret Century needs a series record with member
witnesses rather than a single sheet. The thirteenth, "The Present Survey",
stays local: it is a rhetorical stratum standing for continuous digital feeds,
not a discrete witness.

The four Sondaje test pits hold 52 name cells between them, thirteen per pit -
one per stratum. These are attestation-shaped already: each cell is a place, a
source, a reading or a silence, a language set and an editorial note. They
migrate as `partial`, since twenty representative cells are seeded now and the
rest transcribe under KAN-335.

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

**The toponym concordance inherits the same conflation.** The
`sarmizegetusa` entry in `src/lib/toponyms.ts` carries Regia's coordinates while
listing both `Sarmizegetusa Regia` and `Ulpia Traiana Sarmizegetusa` as ancient
names of one place. It is marked `retire`, superseded by the two CND records.
The `napoca` entry is sound and is marked `link` - it stays as the Atlas overlay
source and gains a corpus reference.

**No locator survives anywhere.** Every stela names a repository; none names a
page, folio or sheet. This is why Trench A's research gate is `partial` and why
all seeded attestations sit at `locator_type: none` and `review_state: raw`.

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
