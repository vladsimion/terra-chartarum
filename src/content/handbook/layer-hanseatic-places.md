---
id: layer-hanseatic-places
title: Hanseatic places and participation phases
summary: Sixty source-linked city, market and Kontor phases with historical and modern names, and an explicit class for what each place's participation actually was.
docType: layer
pattern: B
programme: hanseatic
layerId: hanseatic-places
lifecycle: published
lastReviewed: '2026-08-23'
referencesDocIds:
  - data-fields-hanseatic
  - decision-network-not-territory
relatedLayerIds:
  - hanseatic-routes
  - hanseatic-events
relatedCollectionIds:
  - hanseatic-world
relatedEssaySlugs:
  - the-league-that-left-no-map
citation:
  version: 'hanseatic-places-kan307'
  licence: 'CC BY 4.0'
technicalLinks:
  - label: HSE data dictionary
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/hanseatic/data-dictionary.md'
  - label: HSE decisions log
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/hanseatic/decisions.md'
---

## What you are looking at

Sixty phases across the cities, markets and Kontore of the Hanseatic world, from
the late thirteenth century to the League's long afterlife in the eighteenth.

## How to read this layer

Symbol size follows `role`: how a place participated, not how large it was.
Lübeck is large here because it convened the League, not because of its
population.

Participation was phased and reversible. A city that was active in 1360 and
merely represented by 1450 appears as two features, and the year slider shows
which arrangement was in force.

**Both names travel with each place.** Historical and modern names are carried
together and both are searchable, because a map that silently substitutes
_Tallinn_ for _Reval_ has rewritten its sources.

## Why there is no territory here

Because the League had none. See
[why the Hanseatic League has no territory on this map](/atlas/handbook/decisions/network-not-territory/).

## Historical scope

1295 to 1761, phased per feature.

## Sources and evidence

Compiled from the HSE gazetteer, after Marczinek, Maurer and Rauch; UNESCO's
Hanseatic documentation; Henn; and GeoNames for modern positions. Each claim
carries its source key into the corpus's evidence table.

## Reconstruction and uncertainty

Positions are modern locations of the historical places and are secure. What is
uncertain is **classification and date**: the League kept no membership roll, so
whether a town counts as `active_city` or `represented_city` in a given decade is
a reading of what the sources show it doing.

Where the evidence is thin the phase says so rather than promoting the place.

## Data fields

`role` drives the symbol; every feature carries names, validity range and source
keys. See [the Hanseatic data fields](/atlas/handbook/data-fields/hanseatic/).

## Data and downloads

GeoJSON under CC BY 4.0. Attribution: _Terra Chartarum; Marczinek, Maurer &
Rauch; UNESCO; Henn; GeoNames._
