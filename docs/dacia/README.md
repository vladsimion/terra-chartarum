# Corpus Chartarum Daciae

CCD is a research cycle of seven trenches over the cartographic record of Dacia
and Romania, carried by one shared evidence backbone - Corpus Nominum Daciae -
rather than by seven private copies of the same facts.

```text
data/dacia/reference   frozen IDs, vocabularies, gates
data/dacia/*.csv       CND place, source and attestation authorities
data/dacia/pilot       Trench A inventory and the frozen 40-place pilot
  -> scripts/dacia/validate.py
  -> npm run dacia:validate  (also runs inside npm run build)
```

`make dacia` compiles the tables into the CND 0.1 research release under
`data/dacia/release/cnd-0.1` (CSV, Parquet, JSON-LD, manifest) and two Atlas
tiers in `public/geo`. The build is deterministic - no timestamps, sorted keys,
stable row order - so identical inputs produce identical bytes and the only
thing that can move a hash is the data.

The same command now emits the complete, fail-closed
[CND v1.0 release candidate](./cnd-v1-release.md). Its QA report makes the
coverage, scholarly-review, rights, authority-reconciliation and DOI state
machine-readable; it cannot silently relabel the pilot as a citable v1.0.

**CND 0.1 is a pilot release.** The distinction is carried in the outputs rather
than in a caveat: the **public** tier holds only records cleared by human review
and is what the Atlas shows by default, and the **research** tier holds
everything with `review_state` on every record. The public tier is currently
empty, and it should be - nothing has been reviewed against a witness yet.

The reference directory also holds two pre-digitisation research ledgers:
[`hiatus-witness-families.csv`](../../data/dacia/reference/hiatus-witness-families.csv)
for KAN-348 and
[`treaty-frontier-sources.csv`](../../data/dacia/reference/treaty-frontier-sources.csv)
for KAN-351. Their minimum sets are hash-frozen together in
[`source-ledger-manifest.json`](../../data/dacia/reference/source-ledger-manifest.json).
See the [witness audit](./hiatus-witness-audit.md) and
[frontier source ledger](./treaty-frontier-source-ledger.md) for the review and
rights boundaries.

The next research tranche adds the filterable
[Hiatus timeline](./hiatus-timeline.md), the
[Carta Rubra evidence package](./carta-rubra-evidence-package.md), and the
[bounded Borroczyn seam](./borroczyn-seam-source-package.md). Their tables and
the seam GeoJSON are hash-frozen in
[`research-package-manifest.json`](../../data/dacia/reference/research-package-manifest.json).
These are candidate research packages: a valid table is not a substitute for a
named scholarly review or a production reuse grant.

Campaign III adds a fail-closed
[Borroczyn georeferencing contract](./borroczyn-georeferencing.md) and the
[In Manibus physical-object evidence chain](./in-manibus-inventory.md). Their
generated packages may be built and tested while held; neither a research-only
raster nor a catalogue description can cross the production gate by implication.

## The trench roster

| ID      | Trench                                   | Epic    | Campaign |
| ------- | ---------------------------------------- | ------- | -------- |
| `ccd-a` | Terra Sigillata · Lapidarivm Dacicvm     | KAN-318 | I        |
| `ccd-b` | Hiatvs · Argumentum ex Silentio          | KAN-321 | II       |
| `ccd-c` | Nomen Errans · The Migration of a Word   | KAN-320 | I        |
| `ccd-d` | Carta Rvbra · The Ethnographic Weapon    | KAN-323 | II       |
| `ccd-e` | Borroczyn · The Parcel and the Bulldozer | KAN-324 | III      |
| `ccd-f` | Dacia Rediviva · Ancestry as Cartography | KAN-327 | IV       |
| `ccd-g` | In Manibvs · Dacia in the Cabinet        | KAN-325 | III      |

Alongside them run four workstreams: `cnd` (the corpus), `ccd-gis` (Atlas
layers), `ccd-acq` (acquisition dossiers) and `ccd-ix` (the programme index).
[`programme-ids.csv`](../../data/dacia/reference/programme-ids.csv) is the
register; the table above is a convenience, and the register wins.

Trench A was published before the programme existed. It joins by migration
(KAN-338/339), not by being grandfathered - see
[`trench-a-inventory.md`](./trench-a-inventory.md).

## One vocabulary for the repository and Jira

A programme identifier is used unchanged as the directory name, the Jira label
and the prefix of every planning ID in an issue summary. `ccd-c` is the trench
in `programme-ids.csv`, the label on KAN-344, and the `[CCD-C1]` in its title.
The validator enforces the first two: `jira_label` must equal `id`.

Every Dacia issue also carries `programme-dacia` and its campaign label
(`campaign-i` … `campaign-iv`).

## Identifiers

Entities carry a typed prefix, registered in
[`entity-prefixes.csv`](../../data/dacia/reference/entity-prefixes.csv):

| Prefix | Entity            | Externally stable from |
| ------ | ----------------- | ---------------------- |
| `plc-` | place             | `cnd-0.1`              |
| `src-` | source            | `cnd-0.1`              |
| `att-` | attestation       | `cnd-1.0`              |
| `nmu-` | name use          | `cnd-1.0`              |
| `nue-` | name-use edge     | `cnd-1.0`              |
| `obj-` | collection object | Trench G release       |
| `frn-` | frontier segment  | GIS release            |

Identifiers are kebab-case; controlled-vocabulary terms are snake_case. Keeping
the two shapes distinct means an ID can never be mistaken for a term, and the
validator can tell a join key from a category at a glance.

**A place is one referent, never one name.** The single most common way to
corrupt a gazetteer is to let a record stand for a name and then attach every
place that name has ever meant. Trench A already contains an instance: its
Sarmizegetusa test pit covers both the Dacian royal seat and the Roman colonia
forty kilometres away. CND splits them into `plc-sarmizegetusa-regia` and
`plc-ulpia-traiana-sarmizegetusa`, and the attestations divide according to what
each source actually names.

### Immutability

An identifier is frozen the moment it reaches `main`. After that:

- A rename changes `reference_name`. It never changes the ID, and the ID is
  never re-derived from the new name.
- A record that turns out to be wrong is retired, not deleted and never reused.
  Retirement sets the row's state and names its successor.
- Merging two records keeps the earlier ID and retires the later one.
- An ID that has been published under a corpus version cannot be withdrawn from
  that version; it can only be superseded in the next one.

`externally_stable_from` records the version at which each prefix becomes a
promise to the outside world. Before that version an ID is internal and may be
renumbered in bulk; after it, the rules above are binding. Attestation IDs are
deliberately later than places and sources: the pilot's attestation set will be
rebuilt wholesale during transcription, and pretending otherwise would freeze
the wrong thing.

**No human-readable name is a join key.** Foreign keys hold IDs. The validator
resolves every `place_id` and `source_id` against its authority, so a name in an
FK column fails rather than silently matching nothing.

## The programme index

[`/programmes/corpus-chartarum-daciae/`](../../src/pages/programmes/corpus-chartarum-daciae.astro)
is the public index of the cycle (KAN-370). All seven trenches are discoverable
from it whether or not they have been written, each with its primary room, its
gate tally, its open verification debts and the number of records it has
actually migrated into the shared corpus.

Nothing about a trench's state is written into that page. `make dacia` compiles
`src/data/dacia/generated/programme.json` from `programme-ids.csv`,
`trench-gates.csv`, `verification-debt.csv` and the migration inventory, and the
page renders it - because a hand-maintained index is a second copy of the
programme's state and the copy is the one that goes stale.

Two things the index is careful about. **Consumption is counted, not claimed**:
a trench appears as reading the shared corpus by having records in it, which
today only Trench A does. And the shared datasets are listed once, as programme
infrastructure, rather than under the essay that happens to show them first.

Terra Sigillata is presented there as the cycle's intellectual index and is not
extended as one: no stone was added and none will be. The index is discoverable
from the essay in turn, which is how the series pages work elsewhere in the
site.

## Running the gate

```bash
npm run dacia:validate
```

```bash
npm run dacia:test
```

```bash
python3 scripts/dacia/review.py queue --verbose
```

`dacia:validate` runs inside `npm run build`. `dacia:test` needs pytest, which
is not vendored - use the venv from `make vmn-venv`, or install it yourself.
`review.py` is the adjudication workflow: it promotes a record only if the
ordinary gate still passes afterwards, so an unearned promotion writes nothing.
It covers places, sources, attestations and, since KAN-344, name uses and their
edges.

## In the Atlas

Both tiers register as GeoLayers. A layer declares which feature properties are
filterable in its `facets` field, and the map island builds the panel from the
committed GeoJSON at build time - so a new corpus layer arrives with its own
filters rather than requiring a change to the island. Selections widen within a
field and narrow across fields, are announced for screen readers, and travel in
a `facets` URL parameter that only restores values the layer actually declares.

See [`reception-corpus.md`](./reception-corpus.md) for Trench F's corpus and the
rubric that keeps reception from becoming evidence,
[`acquisition-dossiers.md`](./acquisition-dossiers.md) for the priority map
families and what each still has to establish,
[`nomen-errans-ledger.md`](./nomen-errans-ledger.md) for what the word
Dacia has meant and what may be shown beside it,
[`shared-gis-layers.md`](./shared-gis-layers.md) for the shared Atlas layers,
[`data-dictionary.md`](./data-dictionary.md) for the schemas,
[`definition-of-done.md`](./definition-of-done.md) for the gates, and
[`trench-a-inventory.md`](./trench-a-inventory.md) for the migration and the
frozen pilot.
