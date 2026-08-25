---
id: data-fields-crusades
title: Crusades data fields
summary: What the Crusades layers commit to when they say a stage, a route, a claim, a possession or a centre.
docType: data-fields
pattern: B
programme: crusades
routeSlug: crusades
lifecycle: in-review
lastReviewed: '2026-08-25'
relatedLayerIds:
  - crusades-itinerary
  - crusades-fourth-crusade-routes
  - crusades-fourth-crusade-events
  - crusades-jerusalem-network
relatedCollectionIds:
  - maps-for-a-crusade
technicalLinks:
  - label: Crusades source and rights audit
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/crusades/source-audit.md'
  - label: The three registers
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/crusades/two-proofs.md'
---

## Why these fields exist

The Crusades flagship makes three arguments, and each rests on a distinction
that is easy to lose in a spreadsheet.

## Stage, and why it has no position

A stage of Matthew Paris's itinerary is a cell in a strip diagram. The itinerary
is a vertical sequence of towns with day-marks drawn between them, and it has no
projection whatsoever: no scale, no orientation, no coordinates.

So a stage record has nowhere to put a position, and the field that looks like
one is called `modernReference`. That is the coordinate of the _modern town the
stage names_, supplied so the diagram can be compared with a map. It is never
something the manuscript gives.

`depictedDays` is the number of day-marks the diagram draws before a stage. It is
the manuscript's claim about the journey, not a measurement of it, and nothing in
this project converts it into a travel time.

## The six states of a campaign

A single route line from Venice to Constantinople would destroy six different
kinds of claim. They are kept as separate records:

| `stateKind`            | What it is                                 |
| ---------------------- | ------------------------------------------ |
| `intended_destination` | Where the crusade contracted to go         |
| `negotiated_diversion` | Where it agreed instead, and on what terms |
| `travelled_route`      | Where the fleet actually went              |
| `attack`               | An assault at a place, on a date           |
| `partition_claim`      | Territory a treaty assigned                |
| `durable_control`      | Territory somebody actually held           |

`held` carries the difference the whole proof turns on: `held`,
`claimed_not_held`, or `not_applicable`. The Partitio Romaniae assigned an empire
among people who held very little of it, and a record that could not say so would
republish the document's wishful thinking as geography.

Three states carry no geometry at all, and that is a finding rather than a gap.
The intended destination was a clause in a contract; the partition's boundaries
are disputed in the scholarship; and what was durably held is contested
throughout and already modelled properly by the Venetian possessions layer.

## The six registers of a city

Jerusalem is not one kind of object, and a table that held it as one row would
have made the essay's argument impossible to state. `roleKind` carries which
kind of claim a record is:

| `roleKind`               | What it asserts                        | Drawn |
| ------------------------ | -------------------------------------- | ----- |
| `sacred_centre`          | The world is arranged around this city | no    |
| `pilgrimage_destination` | What the journey was for               | no    |
| `textual_construct`      | The land has an order, and this is it  | no    |
| `cartographic_construct` | The land ruled into squares            | no    |
| `network_node`           | Something passed through here          | yes   |
| `cartographic_memory`    | The centring outlived its subject      | no    |

Only the ports are drawn. The middle of a mappa mundi is not at 31.78° N; it is
in the middle, and a pin there would convert a claim about what the world is
arranged around into a claim about where a city is.

`catalogueObjectId` joins a record to an object in this site's own collection.
`sourceId` is null for exactly one register: later cartographic memory cites no
source in the audit, because an early-modern map that centres Jerusalem is a
witness to the early modern period and nothing in this corpus may use it as a
witness to the twelfth century.

## Geometry provenance

`editorial_generalisation`, `modern_reference`, `not_spatial`.

There is no value for a documented track, because no source in this corpus gives
one. Both route lines are generalisations between named ports, drawn so the shape
of a campaign is legible, and dashed so nobody measures them.

## Review state

`raw`, `normalized`, `reviewed`, `approved`, `published`. Everything here is
`raw`. Not one folio has been transcribed and no witness is cleared for
publication, which is what the source audit records and what the release
manifest asserts.
