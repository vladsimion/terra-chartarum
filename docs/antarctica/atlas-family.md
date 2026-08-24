# The Antarctic Atlas family (KAN-430)

Four layers and one collection, published through the existing scalable
catalogue rather than as a new flat list.

## The layers

| Layer                          | Holds                                                  | Category                 |
| ------------------------------ | ------------------------------------------------------ | ------------------------ |
| `antarctica-conjectured-south` | The Terra Australis envelope                           | Territories & boundaries |
| `antarctica-expedition-tracks` | Cook, the Endurance approach, plan, drift, James Caird | Networks & circulation   |
| `antarctica-observations`      | Nineteen dated positions                               | Places & settlements     |
| `antarctica-ghost-geographies` | Disproved features. Currently empty.                   | Territories & boundaries |

They are split by the argument each carries, not by geometry type. The
line-versus-point division inside that split is a MapLibre constraint - one
render hint per layer - and every one of the four is compiled from the single
projection in `scripts/antarctica/build.py` that the essay also reads.

Antarctica adds four entries to the top-level catalogue, not fifteen. The
specification lists fifteen candidate layers; most of them are subsets of these
four distinguished by `evidenceClass` or `act`, which are facets rather than
layers, and promoting a facet to a layer is how a catalogue stops scaling.

## The collection

`terra-incognita`, with **no default composition**.

That is unusual and deliberate. Every member is `in-review`, so there is nothing
the collection could activate that a reader has not been warned about, and a
reader who merely opens a collection has not asked to be shown uncleared
material. The registry now enforces the rule in both directions: a collection
with a published member owes a default, and a collection with none may not have
one.

## The empty layer

`antarctica-ghost-geographies` ships with an empty asset.

Five ghost features exist in the corpus and not one of their disputed positions
has been located from a source, so every record is non-spatial. Giving one a
point would invent a coordinate for a feature whose significance is that it was
invented.

The contract ships ahead of the data for the same reason `dacia-attestations`
ships ahead of its review: a reader looking for the disproved features finds an
account of why none can yet be placed, rather than finding no layer at all. The
catalogue entry declares the geometry the layer will hold, not the geometry it
currently has.

## A recorded rename

`antarctica-pilot-tracks` and `antarctica-pilot-observations` were registered at
KAN-423 and are retired here.

The rule is that a stable scholarly layer ID is not renamed for UI convenience.
This is not that. Those two IDs were the pilot's, they were `in-review`, never
public, one day old, and ANT-11 is the ticket whose job is to register the real
family. The rename is recorded here so it reads as a migration rather than as a
quiet renumbering, and both old assets were removed rather than left as orphans.

## Time

All four layers use per-feature time. A record's temporal relevance comes from
its own dates, so the Atlas year filter narrows the family the same way it
narrows every other programme.

The one semantic exception is the planned crossing. It has a date on which it was
announced and no date on which anything happened, because nothing did. It is
carried in the tracks layer with the announcement year, and the layer record says
so.
