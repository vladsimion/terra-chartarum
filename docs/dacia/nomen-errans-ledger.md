# Nomen Errans: the evidence ledger

Trench C asks what the word _Dacia_ has meant, to whom, and when. This is the
ledger it argues from: [`name-uses.csv`](../../data/dacia/name-uses.csv),
[`name-use-edges.csv`](../../data/dacia/name-use-edges.csv) and
[`reference/nomen-errans-witnesses.csv`](../../data/dacia/reference/nomen-errans-witnesses.csv).

## Ten careers of one word

Eight uses of _Dacia_ and two of _Napoca_, across four fate classes and six
kinds of source:

| Use                        | Referent                          | Period    | Fate         |
| -------------------------- | --------------------------------- | --------- | ------------ |
| `nmu-dacia-province`       | Trajan's province                 | 106–271   | `applicatio` |
| `nmu-dacia-coin-legend`    | DACIA on imperial coinage         | 106–271   | `applicatio` |
| `nmu-dacia-aureliana`      | The provinces south of the Danube | 283–602   | `applicatio` |
| `nmu-dacia-diocese`        | The civil diocese containing them | 337–602   | `applicatio` |
| `nmu-dacia-scandinavia`    | Denmark, in medieval Latin        | c. 1300   | `translatio` |
| `nmu-dacia-ecclesiastical` | The Dominican province of Dacia   | 1228–1536 | `translatio` |
| `nmu-dacia-antiquarian`    | Ortelius's restored province      | 1595      | `restitutio` |
| `nmu-dacia-reception`      | Dacia as an identity claim        | 1970–     | `inventio`   |
| `nmu-napoca-roman`         | The Roman town                    | 106–271   | `applicatio` |
| `nmu-napoca-restored`      | Cluj-Napoca, by decree            | 1974–     | `restitutio` |

The evidence is deliberately not all cartographic. Trench A's `source_family`
vocabulary was, because Trench A was; KAN-344 extends it with
`administrative_register`, `numismatic` and `scholarly_edition`, and adds the
_Notitia Dignitatum_ and the Dacia coin types as sources. One of the strongest
cases is not a source at all: **a use exercised by an institution needs no
witness to be real.** The Dominican province of Dacia is attested by the order
that used the name, and the schema has allowed that since KAN-336 -
`source_id` or `institution`, either will do.

## The commercial career, and why it is not here

The word did not stop in 1974. From 1966 a Romanian carmaker took it, and from
1999 Renault took the carmaker, and the name now reaches more people on a boot
lid than it ever did on a map. The ledger carried both phases as a
`commercium` fate class until KAN-344's review pass, and they are gone
deliberately.

The reason is scope, not evidence. Trench C argues how a place-name migrates
between referents; following it into trademark registers and marque management
turns a question about historical geography into one about branding, which is a
different essay and not one this programme is writing. Terra Chartarum's
subject is the map and the territory. A corporate identity that happens to
reuse a provincial name is a real use of the word and an uninteresting one for
the argument at hand.

Excised with the rows: the `commercium` fate class and the `product`
`referent_kind`, both now unused; the two edges that reached the marque; and
the Dacia 1300 photograph from the rights package, whose own assessment already
observed that no publishable image of a modern car exists. Nothing about the
removal is reversible by accident - restoring the career means restoring the
vocabulary terms too, which is the point of writing it down here.

## What the edges refuse to say

Eleven edges, four of them explicit non-relationships. The rule from KAN-336
is that a shared string is not a relationship, and this trench is where it
earns its keep: a Roman mint striking DACIA and a medieval clerk writing
_Dacia_ for Denmark are joined by `homonym_only`, in a row, so no reader has to
decide for themselves whether the coin is evidence about Denmark.

The instructive case is `nue-napoca-roman-restored`. Anyone can see that the
Napoca restored to Cluj by decree in 1974 is the Roman town's name coming back.
The schema still will not let that be a `continuity` edge, because continuity
has to cite an attestation and none asserts that the name stayed in use across
the seventeen centuries between. **Obviousness is not evidence**, and the edge
is recorded as a `revival` - which at least has to name the instrument that
reinstated the name. Not one of the eleven edges is a `continuity`, and that is
the ledger's most substantive claim: nothing here has yet been shown to be an
unbroken line.

## Readiness

| State      | Uses | Why                                             |
| ---------- | ---- | ----------------------------------------------- |
| `reviewed` | 7    | A person has cleared the row against its source |
| `raw`      | 3    | Locator still `pending`                         |

**Seven rows are reviewed**, cleared by Vlad Simion on 2026-08-25: five
`applicatio` (`nmu-dacia-province`, `nmu-dacia-aureliana`, `nmu-dacia-diocese`,
`nmu-dacia-coin-legend`, `nmu-napoca-roman`), one `translatio`
(`nmu-dacia-scandinavia`) and one `restitutio` (`nmu-dacia-antiquarian`).
Nothing reached `reviewed` by machine: the promotion ladder refuses
`llm_assisted` above `normalized` without a named reviewer, and a reviewed row
also needs a real locator. That is the gate working as designed, and the seven
promotions are what a human pass looks like when it happens.

`vd-nomen-errans-review` stays open. KAN-345, KAN-346 and KAN-347 need a
reviewed example of each class the essay argues, and `inventio` has none.

**Three rows are raw** because a use exercised by an institution has no locator
to give until somebody cites the instrument - the 1974 decree, a bibliographic
anchor for the Dominican province, a reception artefact for the identity claim. `pending` is not a
value a normalized row may carry, so those rows stay where they are and
`vd-nomen-errans-locators` says what would move them.

## Where each career lands on the Atlas

KAN-345 routes the reviewed uses to map compositions in
[`reference/nomen-errans-atlas-states.csv`](../../data/dacia/reference/nomen-errans-atlas-states.csv),
one row per reviewed use, and the gate refuses a reviewed use with no row.

| Use                     | Coverage          | Opens                                             |
| ----------------------- | ----------------- | ------------------------------------------------- |
| `nmu-dacia-province`    | `in_coverage`     | Roman sites and network, 150                      |
| `nmu-dacia-coin-legend` | `in_coverage`     | Roman sites, 150 - the referent, not the coin     |
| `nmu-dacia-antiquarian` | `in_coverage`     | The research tier on Ortelius's own reading, 1595 |
| `nmu-napoca-roman`      | `in_coverage`     | The research tier on the Peutinger station, 150   |
| `nmu-dacia-aureliana`   | `no_layer_yet`    | Nothing: south of the Danube is not compiled      |
| `nmu-dacia-diocese`     | `no_layer_yet`    | Nothing: the diocese is not the province          |
| `nmu-dacia-scandinavia` | `out_of_coverage` | Nothing: Denmark is off every Dacia layer         |

The last three are the interesting rows. `no_layer_yet` is work not done and may
one day become a link; `out_of_coverage` is the argument itself, and never will.
Distinguishing them costs a column and stops the trench's own finding - that the
word left the ground the map covers - reading as a missing feature.

The threshold sits in the compiler, not the table. A use demoted below
`reviewed` leaves the essay on the next `make dacia` whatever its routing says,
so the two cannot disagree about what a reader is shown.

## What the flow is allowed to connect

KAN-346 applies the same threshold to `name-use-edges.csv`. Every reviewed name
use becomes a flow node and an inspectable map state, but an edge becomes a
line only when its own row is `reviewed` or higher and both endpoint nodes are
visible. A continuity row still has the stricter validator rule that it must
cite an attestation.

The current result is deliberately six nodes and no lines. Ten Dacia edge rows
are recorded - five `normalized`, five `raw` - and none has had a human review,
so the generated slice reports all ten in `withheldRelations`. The
figure says so instead of promoting chronological order to continuity. A later
human promotion will add the corresponding directed line on the next
`make dacia`; no component edit is required.

## The rights package

Five candidate visual witnesses are assessed, and **none is cleared for
publication**: one needs permission from the holding institution, three need a
rights review, and no reproduction has been resolved for any of them. The
production bar is the same one the other research packages hold - open reuse
rights, a sufficient reproduction, and a repository object identifier - and no
witness clears it.

That is a finding, not a blocker. An essay may be written from description
alone, and knowing so now is better than discovering it at the rights gate. The
one witness with a clear path is the 1876 Seeck edition of the _Notitia_, which
is out of copyright as a text; the page has not been located.

The table is kept separate from the ledger on purpose. What a name meant and
what may be shown beside it are different questions, and a use can be perfectly
well evidenced while having no image anyone may publish - which is exactly the
position this trench is in.

## Reviewing it

`review.py` now owns the ledger tables too (`nmu-` and `nue-` identifiers), so
Trench C is promoted the same way everything else is - and, more to the point,
so the ledger is not a table nobody can promote, which is how a review workflow
fails without anyone noticing.

```bash
python3 scripts/dacia/review.py queue --table name_uses --verbose
```

That trial-promotes each row against the real validator and prints what stands
in its way, so the queue can never drift from the rules. Four rows currently
report `ready to promote`: everything machine-assisted work can do to them has
been done, and only a person can do the rest.

```bash
python3 scripts/dacia/review.py promote nmu-dacia-province --reviewer "Your Name"
```

The promotion is written to a scratch copy of the tables, validated with the
ordinary gate, and kept only if the gate passes - so a promotion that has not
earned its locator writes nothing at all. Reviewing a row means opening the
source at the locator the row claims and confirming it says what the row says.

### What each fate class is actually waiting for

KAN-344's criterion is one reviewed example per fate class, and KAN-345, KAN-346
and KAN-347 all wait on it. "Not reviewed" is the wrong unit to plan with,
though, because the four classes are not blocked on the same thing:

```bash
python3 scripts/dacia/review.py coverage
```

| Fate class   | Rows | What stands in the way                          |
| ------------ | ---- | ----------------------------------------------- |
| `applicatio` | 5    | Satisfied by `nmu-dacia-province`               |
| `restitutio` | 2    | Satisfied by `nmu-dacia-antiquarian`            |
| `translatio` | 2    | Satisfied by `nmu-dacia-scandinavia`            |
| `inventio`   | 1    | A citation. The only row has `locator: pending` |

Three of the four are closed: somebody opened the source at the locator the row
claimed, confirmed it said what the row said, and put their name to it. That was
one command each.

The fourth needs a citation found first, and it is an unusual case worth naming
rather than leaving as a generic gap:

- **`inventio`** (`nmu-dacia-reception`). Deliberately low-confidence and
  open-ended, and the note points at Trench F. A reception claim's evidence is a
  reception artefact, which is the material Trench F is meant to gather. It may
  be right that this class cannot be closed until then.

The table above is generated by `review.py coverage`, and a test asserts the
report distinguishes a missing name from a missing source. Do not maintain the
numbers here by hand - run the command.
