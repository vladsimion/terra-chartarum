# The Road and the Sea (KAN-386, KAN-387, KAN-388, KAN-389)

The two bounded proofs of the Crusades flagship, and the distinction each one
exists to protect.

Tables: `data/crusades/itinerary-stages.csv`, `fourth-crusade-states.csv`, on top
of the KAN-384/385 `source-audit.csv` and `places.csv`.

## Road: a diagram is not a map

Matthew Paris's itinerary runs from London to Otranto in fourteen stages. It is a
strip diagram - a vertical sequence of towns with day-marks drawn between them -
and it has **no scale, no orientation and no coordinates**.

The modelling consequence is the whole proof. A stage record has nowhere to put a
position: the validator refuses a stage row carrying `lon`, `lat` or `geometry`,
and the coordinate used to draw the layer belongs to the _place_ the stage names
and is called `modernReference` everywhere it appears.

Comparing the sequence with the positions is what the interaction is for. Merging
them would answer the question it asks.

Two further rules:

- `depictedDays` is the number of day-marks the diagram draws. It is the
  manuscript's claim about the journey, and nothing converts it into a travel
  time.
- The manuscript label and the modern name are separate fields even where they
  coincide, so the first stage whose drawn name differs needs no migration.

The most revealing row is the Dover to Wissant crossing, drawn in the same units
as a day's walk. A map of the ground could not do that. A map of a journey has to.

## Sea: a claim is not a possession

The Fourth Crusade is usually drawn as a line through Venice, Zara and
Constantinople. Six different things get collapsed into that line, and the
dataset keeps them apart:

| State                  | What it is                          | Geometry         |
| ---------------------- | ----------------------------------- | ---------------- |
| `intended_destination` | Egypt, in the 1201 contract         | none             |
| `negotiated_diversion` | Zara, and the terms that changed    | none             |
| `travelled_route`      | Where the fleet went                | generalised line |
| `attack`               | An assault at a place, on a date    | none             |
| `partition_claim`      | What the Partitio Romaniae assigned | none             |
| `durable_control`      | What anyone actually held           | none             |

The `held` field carries `held`, `claimed_not_held` or `not_applicable`, and the
validator enforces the two rules that matter: a partition claim must be recorded
as claimed and not held, and it may not carry geometry at all. The Partitio
divided an empire among people who held very little of it; drawing the assignment
would republish the document's wishful thinking as geography.

Only `travelled_route` carries geometry, and it does so twice: the assembly at
Venice and the run from Zara to the Aegean. **Six of the eight records are
therefore on no layer**, across five of the six kinds, and the release manifest
records which so a later reader finds a decision rather than an omission.

An attack carries none either, which is worth stating because it is the one that
looks like an exception. A siege happened somewhere, so a point is tempting. But
the point that would be drawn is the _place's_ coordinate, already published by
the place record, and attaching it to the event would assert that the event's
position is independently attested when it is inherited. The place is where
Constantinople is; it is not evidence for where the fleet stood.

## Reuse rather than re-authoring

Where the campaign crosses water the Venetian Maritime Network already publishes,
the state records name the VMN layer instead of compiling their own. The
validator refuses a `vmn_reference` that is not a real VMN layer.

This matters because VMN models Venetian possessions with phased extents and
their own evidence. A Crusades layer drawing post-1204 Venetian control would be
a worse copy of something finished.

## What is not done

Nothing here is reviewed. Every folio locator reads `pending`, no witness is
cleared for publication, and no manuscript image is reproduced - which means the
Road proof cannot yet show the manuscript half of its comparison.

The prototype essay is held at `releaseAt: '2099-01-01'` for the same reason as
TERRA INCOGNITA: publishing an argument whose sources nobody has read would be
the failure the argument is about.

## Why each gate is stopped (KAN-384, KAN-385)

The Dacia programme records why a trench is stopped and which ticket owns each
gate. This pilot recorded neither, so its five open tickets read as blocked for
no stated reason - the condition a debt register exists to end. Two tables now
carry it, with `proof` playing the role `trench` plays in Dacia:

- [`reference/gates.csv`](../../data/crusades/reference/gates.csv) - twelve rows,
  six gates for each proof, each naming the ticket that owns it.
- [`reference/verification-debt.csv`](../../data/crusades/reference/verification-debt.csv) -
  seven open items, each naming the `<proof>:<gate>` pairs it blocks and the way out.

`scripts/crusades/validate.py` enforces the join **in both directions**, which is
the part that matters. An open item must name a gate, or it reaches no ticket and
is lost while still marked open. And a gate below `passed` must have something
naming it, or the register says work remains and names none of it. Adding the
second rule immediately found a gap: `fourth_crusade:interaction` was marked
`partial` with nothing recording what was still missing, which turned out to be
the Atlas feature panel, where a partition claim and a travelled route still
render alike.

Nothing may report `passed` while the corpus is untranscribed, and nothing does:
0 of 12. The essay renders this table rather than restating it in prose, because
a hand-written list of what a prototype cannot yet do is a second copy of the
project's state, and the copy is the one that goes stale.
