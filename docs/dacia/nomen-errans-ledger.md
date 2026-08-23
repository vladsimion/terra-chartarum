# Nomen Errans: the evidence ledger

Trench C asks what the word _Dacia_ has meant, to whom, and when. This is the
ledger it argues from: [`name-uses.csv`](../../data/dacia/name-uses.csv),
[`name-use-edges.csv`](../../data/dacia/name-use-edges.csv) and
[`reference/nomen-errans-witnesses.csv`](../../data/dacia/reference/nomen-errans-witnesses.csv).

## Twelve careers of one word

Ten uses of _Dacia_ and two of _Napoca_, across five fate classes and five kinds
of evidence:

| Use                        | Referent                          | Period    | Fate         |
| -------------------------- | --------------------------------- | --------- | ------------ |
| `nmu-dacia-province`       | Trajan's province                 | 106–271   | `applicatio` |
| `nmu-dacia-coin-legend`    | DACIA on imperial coinage         | 106–271   | `applicatio` |
| `nmu-dacia-aureliana`      | The provinces south of the Danube | 283–602   | `applicatio` |
| `nmu-dacia-diocese`        | The civil diocese containing them | 337–602   | `applicatio` |
| `nmu-dacia-scandinavia`    | Denmark, in medieval Latin        | c. 1300   | `translatio` |
| `nmu-dacia-ecclesiastical` | The Dominican province of Dacia   | 1228–1536 | `translatio` |
| `nmu-dacia-antiquarian`    | Ortelius's restored province      | 1595      | `restitutio` |
| `nmu-dacia-marque`         | The marque founded at Colibași    | 1966–     | `commercium` |
| `nmu-dacia-marque-renault` | The same marque under Renault     | 1999–     | `commercium` |
| `nmu-dacia-reception`      | Dacia as an identity claim        | 1970–     | `inventio`   |
| `nmu-napoca-roman`         | The Roman town                    | 106–271   | `applicatio` |
| `nmu-napoca-restored`      | Cluj-Napoca, by decree            | 1974–     | `restitutio` |

The evidence is deliberately not all cartographic. Trench A's `source_family`
vocabulary was, because Trench A was; KAN-344 extends it with
`administrative_register`, `numismatic` and `scholarly_edition`, and adds the
_Notitia Dignitatum_ and the Dacia coin types as sources. Two of the strongest
cases are not sources at all: **a use exercised by an institution needs no
witness to be real.** The Dominican province of Dacia and the Automobile Dacia
marque are attested by the order and the company that used the name, and the
schema has allowed that since KAN-336 - `source_id` or `institution`, either
will do.

## What the edges refuse to say

Thirteen edges, four of them explicit non-relationships. The rule from KAN-336
is that a shared string is not a relationship, and this trench is where it
earns its keep: a Roman mint striking DACIA and a medieval clerk writing
_Dacia_ for Denmark are joined by `homonym_only`, in a row, so no reader has to
decide for themselves whether the coin is evidence about Denmark.

The instructive case is `nue-dacia-marque-renault`. Anyone can see that the
marque under Renault from 1999 is the same marque founded in 1966. The schema
still will not let that be a `continuity` edge, because continuity has to cite
an attestation and none has been cited. **Obviousness is not evidence**, and the
edge is recorded as a `derivation` until somebody produces the document.

## Readiness, and why nothing is reviewed

| State        | Uses | Why                                                       |
| ------------ | ---- | --------------------------------------------------------- |
| `normalized` | 7    | Source, locator, referent, period, fate class, confidence |
| `raw`        | 5    | Locator still `pending`                                   |
| `reviewed`   | 0    | No person has cleared a row against its source            |

Both numbers are structural rather than incidental.

**Nothing is reviewed** because machine-assisted work cannot review itself. The
promotion ladder refuses `llm_assisted` above `normalized` without a named
reviewer, and a reviewed row also needs a real locator. That is the gate working
as designed, and it is what `vd-nomen-errans-review` records: KAN-345, KAN-346
and KAN-347 all require reviewed records, so the rest of Trench C waits on a
human pass.

**Five rows are raw** because a use exercised by an institution has no locator
to give until somebody cites the instrument - the 1974 decree, a trademark
record, a bibliographic anchor for the Dominican province. `pending` is not a
value a normalized row may carry, so those rows stay where they are and
`vd-nomen-errans-locators` says what would move them.

## The rights package

Six candidate visual witnesses are assessed, and **none is cleared for
publication**: two need permission from the holding institution, three need a
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
in its way, so the queue can never drift from the rules. Seven rows currently
report `ready to promote`: everything machine-assisted work can do to them has
been done, and only a person can do the rest.

```bash
python3 scripts/dacia/review.py promote nmu-dacia-province --reviewer "Your Name"
```

The promotion is written to a scratch copy of the tables, validated with the
ordinary gate, and kept only if the gate passes - so a promotion that has not
earned its locator writes nothing at all. Reviewing a row means opening the
source at the locator the row claims and confirming it says what the row says.

KAN-345, KAN-346 and KAN-347 need at least one reviewed example of each fate
class before they can start.
