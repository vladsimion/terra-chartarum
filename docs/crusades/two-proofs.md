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
| `attack`               | An assault at a place, on a date    | place position   |
| `partition_claim`      | What the Partitio Romaniae assigned | none             |
| `durable_control`      | What anyone actually held           | none             |

The `held` field carries `held`, `claimed_not_held` or `not_applicable`, and the
validator enforces the two rules that matter: a partition claim must be recorded
as claimed and not held, and it may not carry geometry at all. The Partitio
divided an empire among people who held very little of it; drawing the assignment
would republish the document's wishful thinking as geography.

Three states are therefore on no layer, and the release manifest records which
three so a later reader finds a decision rather than an omission.

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
