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

The index also publishes the cross-registry paths the committed identifiers can
actually prove. A path begins with a migrated Terra Sigillata source and follows
its period, sample attestation and place through the canonical collection object,
cartographer, Atlas layer, corpus record, trench and essay stratum. Planned
relationships do not appear early: while Trench A is the only demonstrated corpus
consumer, it is also the only trench allowed to emit these paths. The linked
attestations retain their research review state on the page.

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

## Why a trench is blocked (KAN-349, KAN-354, KAN-355)

Three registries already record this and were never joined.
`verification-debt.csv` names the gate each outstanding item blocks, as
`<trench>:<gate>`; `trench-gates.csv` maps that pair to the Jira key that owns
the gate. So the chain from _a repository has not been confirmed_ to _KAN-349
cannot close_ is fully determined by committed data - it just took three files
and a join by eye, which meant in practice nobody read it and the tickets looked
blocked for no stated reason.

```bash
python3 scripts/dacia/review.py blocked
```

Seventeen open items across nine tickets. Grouping by ticket rather than by debt
is the point: one item blocking four tickets and four items blocking one ticket
are different situations, and only the ticket-shaped view tells you which you
have.

For the Campaign II trenches specifically:

| Ticket  | Blocked by                    | What closes it                                                        |
| ------- | ----------------------------- | --------------------------------------------------------------------- |
| KAN-349 | `vd-hiatus-witness-review`    | A named researcher reviews bounded samples and promotes states singly |
| KAN-354 | `vd-carta-rubra-claim-review` | Each high-importance claim reviewed against its cited map or text     |
| KAN-355 | `vd-treaty-frontier-geometry` | Georeference the Berlin, Trianon, 1947 and Vienna Award annex maps    |

KAN-350 and KAN-356 carry no debt of their own. They are the release tickets for
those trenches and wait on the ones above.

Trench G was added to the register the same way (KAN-362). It had carried no
debt at all, so its three tickets read as blocked for no stated reason:

| Ticket  | Blocked by                                                | What closes it                                                                         |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| KAN-360 | `vd-in-manibus-inspection`, `vd-in-manibus-object-rights` | A named inspector examines the candidate sheets; a rights basis for their reproduction |
| KAN-361 | `vd-in-manibus-inspection`                                | The same inspections - an object row requires a `reviewed` one                         |
| KAN-362 | `vd-in-manibus-essay-claims`                              | The two above; the essay is downstream of both and cannot precede them                 |

## Whether the cycle closes (KAN-371)

`blocked` answers _why can this ticket not close_. The programme's own closing
ticket asks the question one level up, and it gets its own command:

```bash
python3 scripts/dacia/review.py reconcile
```

It prints each of KAN-371's acceptance criteria with a verdict and a count
against its target, then the per-trench state. It is expected to report OPEN for
most of this programme's life, and failing usefully is the point: _one of seven
trenches has passed its release gate_ says something a bare "not ready" does not.

Two of the five criteria - every index reference resolving, every trench
recording all six gates - are already refusals in `validate.py`, which
`reconcile` runs first and stops on. Reaching the report is the check, so the
command attributes them rather than carrying a second copy of the rules. It
exits 0 either way: an unfinished cycle is the normal state here, and a command
that failed CI for saying so would be out of CI within a week.

**Two open items block no recorded gate at all** - `vd-roman-baseline-geometry`
and `vd-principality-envelopes` have an empty `blocks` column, so no gate-driven
view of the programme would ever have surfaced them. The report lists them
separately rather than dropping them. They need either the gate they block named
or the item closed; open debt that nothing points at is how an item is lost.
