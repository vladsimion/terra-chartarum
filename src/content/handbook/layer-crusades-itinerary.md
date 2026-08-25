---
id: layer-crusades-itinerary
title: Matthew Paris itinerary, stage by stage
summary: Fourteen stages of a drawn road, shown at modern positions the manuscript never gives.
docType: layer
pattern: B
programme: crusades
layerId: crusades-itinerary
lifecycle: in-review
lastReviewed: '2026-08-24'
referencesDocIds:
  - data-fields-crusades
relatedLayerIds:
  - crusades-fourth-crusade-routes
relatedCollectionIds:
  - maps-for-a-crusade
citation:
  version: 'cru-pilot-0.1'
  licence: 'CC BY 4.0'
technicalLinks:
  - label: The three registers
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/crusades/two-proofs.md'
  - label: Crusades source and rights audit
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/crusades/source-audit.md'
---

## What you are looking at

Fourteen points, one for each stage of the road from London to Otranto as Matthew
Paris drew it in the middle of the thirteenth century.

**These are not the manuscript's positions.** The itinerary has none. It is a
strip diagram: a vertical column of towns with day-marks drawn between them, no
scale, no orientation and no coordinates at all. Each point here is the modern
location of the town a stage names, supplied so the sequence can be compared with
a map.

That comparison is the whole proof. A medieval traveller's world was a list of
days, and turning it into a map is something we are doing, not something Matthew
Paris did.

## How to read this layer

Every point declares `modern_reference` as its provenance, because that is
exactly what it is.

The evidence is in the properties, not the position: the label as the diagram
gives it, the day-marks drawn before the stage, and whether the stage is a road
stage, a sea crossing or a mountain pass. The crossing from Dover to Wissant is
drawn in the same units as a day's walk, which is the diagram's most revealing
simplification and worth looking at.

## Historical scope

1250 to 1259, the working range for the itinerary witnesses.

## Sources and evidence

Four witnesses are in the audit: two manuscripts at the British Library and the
Parker Library, one further Chronica volume, and Luard's edition of the text.

**Not one folio has been transcribed and no witness is cleared for publication.**
Every stage's folio reference reads `pending`, and the library terms for the
digitised images have not been read, so nothing about presentation may be
assumed.

## Reconstruction and uncertainty

The day-marks are the manuscript's claim about the journey. This project does not
convert them into a travel time, and no interface should present them as one.

Where witnesses branch, the stage records a variant note rather than picking a
reading. Rome is the clearest case: it is both a destination and a stage, and the
diagram handles that by drawing it twice as large.

## Editorial decisions

The manuscript label and the modern name are separate fields even where they
coincide, because the day the corpus finds a stage whose drawn name differs from
its modern one, the model has to hold both already.

## Data fields

See [the Crusades data fields](/atlas/handbook/data-fields/crusades/).

## Data and downloads

CC BY 4.0 for the compiled records. In review: no folio read, no witness cleared,
not citable as established evidence.
