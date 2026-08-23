---
id: layer-hanseatic-routes
title: Hanseatic trade corridors
summary: Seven maritime, riverine, overland and mixed corridors whose line width states how well attested each one is.
docType: layer
pattern: B
programme: hanseatic
layerId: hanseatic-routes
lifecycle: published
lastReviewed: '2026-08-23'
referencesDocIds:
  - data-fields-hanseatic
  - decision-network-not-territory
relatedLayerIds:
  - hanseatic-places
  - hanseatic-events
relatedCollectionIds:
  - hanseatic-world
relatedEssaySlugs:
  - the-league-that-left-no-map
citation:
  version: 'hanseatic-routes-kan308'
  licence: 'CC BY 4.0'
technicalLinks:
  - label: HSE data dictionary
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/hanseatic/data-dictionary.md'
---

## What you are looking at

Seven corridors carrying Hanseatic trade: the Baltic and North Sea runs, the
river routes inland, the overland connections between them, and the mixed routes
that used all three.

## How to read this layer

**Line width is evidence strength**, and it is the most important thing on this
layer. A wide line is a corridor the sources describe directly. A narrow one is a
generalised reconstruction drawn to show that a connection existed. It is not
traffic volume, and reading it as volume inverts the meaning.

Dash pattern carries `certainty`, which is a separate question: how sure we are
about this corridor's dating and course, as opposed to how directly it is
attested.

**A corridor is not a road.** It shows a connection and roughly where it ran. The
actual paths varied by season, by cargo and by which lord was charging what that
year.

## Historical scope

1356 to 1669, phased per feature.

## Sources and evidence

After Wubs-Mrozewicz, UNESCO's documentation, and Marczinek, Maurer and Rauch.
Commodity associations are normalised joins rather than free text, so the
question "which corridors carried wax" has one answer.

## Reconstruction and uncertainty

Every corridor here is drawn. None is digitised from a historical route map,
because the League did not produce one. The evidence establishes that goods moved
between these places; the line is this project's way of showing it.

That is why the width encoding exists: without it, a well-documented Baltic run
and an inferred overland link would look identical.

## Data fields

`evidence_type` drives width, `certainty` drives dash. See
[the Hanseatic data fields](/atlas/handbook/data-fields/hanseatic/).

## Data and downloads

GeoJSON under CC BY 4.0. Attribution: _Terra Chartarum; Wubs-Mrozewicz; UNESCO;
Marczinek, Maurer & Rauch._
