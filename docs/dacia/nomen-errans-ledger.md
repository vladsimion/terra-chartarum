# Nomen Errans: the evidence ledger

Trench C asks what the word _Dacia_ has meant, to whom, and when. This is the
ledger it argues from: [`name-uses.csv`](../../data/dacia/name-uses.csv),
[`name-use-edges.csv`](../../data/dacia/name-use-edges.csv) and
[`reference/nomen-errans-witnesses.csv`](../../data/dacia/reference/nomen-errans-witnesses.csv).

## Ten careers of one word

Eight uses of _Dacia_ and two of _Napoca_, across four fate classes and six
kinds of source:

| Use                        | Referent                          | Period  | Fate         |
| -------------------------- | --------------------------------- | ------- | ------------ |
| `nmu-dacia-province`       | Trajan's province                 | 106–271 | `applicatio` |
| `nmu-dacia-coin-legend`    | DACIA on imperial coinage         | 106–271 | `applicatio` |
| `nmu-dacia-aureliana`      | The provinces south of the Danube | 271–    | `applicatio` |
| `nmu-dacia-diocese`        | The civil diocese containing them | 337–602 | `applicatio` |
| `nmu-dacia-scandinavia`    | Denmark, in medieval Latin        | c. 1300 | `translatio` |
| `nmu-dacia-ecclesiastical` | Dominican province at chapter     | 1228    | `translatio` |
| `nmu-dacia-antiquarian`    | Ortelius's restored province      | 1595    | `restitutio` |
| `nmu-dacia-reception`      | Dacia in a state continuity claim | 1974    | `inventio`   |
| `nmu-napoca-roman`         | The Roman town                    | 106–271 | `applicatio` |
| `nmu-napoca-restored`      | Cluj-Napoca, by decree            | 1974–   | `restitutio` |

The evidence is deliberately not all cartographic. Trench A's `source_family`
vocabulary was, because Trench A was; KAN-344 extends it with
`administrative_register`, `numismatic` and `scholarly_edition`, and adds the
_Notitia Dignitatum_ and the Dacia coin types as sources. One of the strongest
cases is institutional rather than cartographic. The Dominican province is
anchored to the 1228 general-chapter constitutions, which name twelve provincial
priors and the four additional provinces including Dacia. The editor notes that
the chapter may have promoted an already existing province rather than founded it;
the row therefore attests use in 1228 without inventing a first-use date.

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

| State        | Uses | Why                                                |
| ------------ | ---- | -------------------------------------------------- |
| `reviewed`   | 7    | A person has cleared the row against its source    |
| `normalized` | 3    | Source and locator fixed; human review outstanding |

**Seven rows are reviewed**, cleared by Vlad Simion on 2026-08-25: five
`applicatio` (`nmu-dacia-province`, `nmu-dacia-aureliana`, `nmu-dacia-diocese`,
`nmu-dacia-coin-legend`, `nmu-napoca-roman`), one `translatio`
(`nmu-dacia-scandinavia`) and one `restitutio` (`nmu-dacia-antiquarian`).
Nothing reached `reviewed` by machine: the promotion ladder refuses
`llm_assisted` above `normalized` without a named reviewer, and a reviewed row
also needs a real locator. That is the gate working as designed, and the seven
promotions are what a human pass looks like when it happens.

**Three rows are normalized and withheld.** The Dominican use now cites the 1228
general-chapter constitutions. The 1974 decree supplies two distinct locators:
its preamble for the state continuity claim and its sole operative article for
the restoration of Napoca to Cluj. None has been assigned a reviewer by machine.

`vd-nomen-errans-review` is resolved for the released argument because the essay
displays only the three fate classes with a reviewed example: `applicatio`,
`translatio` and `restitutio`. The normalized `inventio` row remains below the
compiler's public threshold. Adding that class to the public argument still
requires a named human review.

## The coin row's citation, audited

The fix that gave `nmu-dacia-coin-legend` a real locator (2026-08-27) named its
source as RIC II.3, Hadrian 1648-1663 - Abdy and Mittag (Spink, 2019) - but
said so as an assumption: neither RIC volume was open when the row was
written, only OCRE, and the 1926 RIC II (Mattingly and Sydenham) numbers
Hadrian's Dacia types differently. KAN-468 asked which volume the numbering
actually belongs to.

It settles from the citation alone. OCRE's own identifier for the type,
`ric.2_3(2).hdn.1648`, glosses itself as "RIC II, Part 3 (second edition),
Hadrian 1648" - the `2_3` names the 2019 volume, not the 1926 one. The two
editions do not share a numbering space: Abdy and Mittag renumbered Hadrian's
coinage from scratch, so the same type carries unrelated numbers in each
edition (a published concordance pairs RIC II.3 1347 with the old RIC II 707,
hundreds apart with no fixed offset). The 1926 edition's Hadrian section
never reaches four digits, so 1648-1663 cannot be read as RIC II numbers
under any concordance. The row's citation is confirmed as written; no source,
name-use, or witness row changes.

## Where each career lands on the Atlas

KAN-345 records an Atlas decision for every source-located use in
[`reference/nomen-errans-atlas-states.csv`](../../data/dacia/reference/nomen-errans-atlas-states.csv),
and the gate refuses any use promoted to reviewed without one.

| Use                        | Coverage          | Opens                                             |
| -------------------------- | ----------------- | ------------------------------------------------- |
| `nmu-dacia-province`       | `in_coverage`     | Roman sites and network, 150                      |
| `nmu-dacia-coin-legend`    | `in_coverage`     | Roman sites, 150 - the referent, not the coin     |
| `nmu-dacia-antiquarian`    | `in_coverage`     | The research tier on Ortelius's own reading, 1595 |
| `nmu-napoca-roman`         | `in_coverage`     | The research tier on the Peutinger station, 150   |
| `nmu-dacia-aureliana`      | `no_layer_yet`    | Nothing: south of the Danube is not compiled      |
| `nmu-dacia-diocese`        | `no_layer_yet`    | Nothing: the diocese is not the province          |
| `nmu-dacia-scandinavia`    | `out_of_coverage` | Nothing: Denmark is off every Dacia layer         |
| `nmu-dacia-ecclesiastical` | `out_of_coverage` | Nothing: the church province is Scandinavian      |
| `nmu-dacia-reception`      | `no_layer_yet`    | Nothing: rhetoric is not a historical extent      |
| `nmu-napoca-restored`      | `no_layer_yet`    | Nothing: no modern legal-renaming layer exists    |

The six non-mapped decisions are the interesting rows. `no_layer_yet` is work
not done and may one day become a link; `out_of_coverage` is the argument itself,
and never will. Distinguishing them costs a column and stops the trench's own
finding - that the word left the ground the map covers - reading as a missing
feature.

The threshold sits in the compiler, not the table. A use demoted below
`reviewed` leaves the essay on the next `make dacia` whatever its routing says,
so the two cannot disagree about what a reader is shown.

## What the flow is allowed to connect

KAN-346 applies the same threshold to `name-use-edges.csv`. Every reviewed name
use becomes a flow node and an inspectable map state, but an edge becomes a
line only when its own row is `reviewed` or higher and both endpoint nodes are
visible. A continuity row still has the stricter validator rule that it must
cite an attestation.

The current result is six nodes and eight lines. All ten Dacia edge rows have
now had a human review, and eight of them connect two visible nodes. The other
two do not: `nue-dacia-antiquarian-reception` and `nue-dacia-scandinavia-church`
each land on a use that is still `normalized`, and an edge becomes a line only
when both endpoints are visible. The generated slice reports those two in
`withheldRelations` and the figure counts them rather than drawing them, so a
reviewed edge to an unreviewed referent still promotes nothing. Promoting either
endpoint use will add its directed line on the next `make dacia`; no component
edit is required.

## The rights package

Six candidate visual witnesses are assessed. Five stay research-only: the
Hereford photograph needs permission, three candidates need object-level rights
review, and the exact _Notitia_ page remains unlocated. The official-gazette
scan of Decree 194/1974 is the sole production witness. Its page identity and
resolution are fixed, and the Wikimedia source record applies PD-RO-exempt to
the official text and document photograph.

The table is kept separate from the ledger on purpose. What a name meant and
what may be shown beside it are different questions, and a use can be perfectly
well evidenced while having no image anyone may publish. Conversely, the decree
may be reproduced while its normalized name-use interpretations remain withheld:
reuse permission does not perform scholarly review.

## Reviewing it

`review.py` now owns the ledger tables too (`nmu-` and `nue-` identifiers), so
Trench C is promoted the same way everything else is - and, more to the point,
so the ledger is not a table nobody can promote, which is how a review workflow
fails without anyone noticing.

```bash
python3 scripts/dacia/review.py queue --table name_uses --verbose
```

That trial-promotes each row against the real validator and prints what stands
in its way, so the queue can never drift from the rules. The three normalized
rows now report `ready to promote`: everything machine-assisted work can do to
them has been done, and only a person can do the rest.

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

| Fate class   | Rows | State                                          |
| ------------ | ---- | ---------------------------------------------- |
| `applicatio` | 5    | Satisfied by `nmu-dacia-province`              |
| `restitutio` | 2    | Satisfied by `nmu-dacia-antiquarian`           |
| `translatio` | 2    | Satisfied by `nmu-dacia-scandinavia`           |
| `inventio`   | 1    | Source-located and one named human review away |

Three of the four are closed: somebody opened the source at the locator the row
claimed, confirmed it said what the row said, and put their name to it. That was
one command each.

The fourth is deliberately excluded from the released career sequence. Its
source is no longer missing: the preamble to Decree 194/1974 invokes Dacia
Porolissensis while making a modern continuity claim. The row stays normalized
until a named reviewer checks that interpretation; the compiler counts it but
does not display it.

The table above is generated by `review.py coverage`, and a test asserts the
report distinguishes a missing source from a missing reviewer. Do not maintain
the numbers here by hand - run the command.
