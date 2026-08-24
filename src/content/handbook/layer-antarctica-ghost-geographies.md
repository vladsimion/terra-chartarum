---
id: layer-antarctica-ghost-geographies
title: Ghost geographies
summary: Five features that were claimed, mapped and later removed. The layer is empty, and this page explains why that is the correct state.
docType: layer
pattern: B
programme: antarctica
layerId: antarctica-ghost-geographies
lifecycle: in-review
lastReviewed: '2026-08-24'
referencesDocIds:
  - data-fields-antarctica
relatedLayerIds:
  - antarctica-observations
  - antarctica-conjectured-south
relatedCollectionIds:
  - terra-incognita
citation:
  version: 'ant-pilot-0.1'
  licence: 'CC BY 4.0'
technicalLinks:
  - label: Ghost geographies methodology
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/antarctica/ghost-geographies.md'
  - label: Antarctic data dictionary
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/antarctica/data-dictionary.md'
---

## What you are looking at

Nothing, at present. The layer is registered and its asset is empty.

Five ghost features are recorded in the corpus: a coast reported in the Weddell
Sea in 1823, a range reported south of the Ross Sea coast in 1841, a stretch of
continental coast charted in 1840 and later sailed through, and two islands
reported in the southern ocean and eventually removed from charts.

Not one of their disputed positions has been located from a source. Every record
therefore carries no geometry, and the layer that would draw them holds nothing.

## How to read this layer

The empty layer is the honest state, not a bug and not a placeholder.

A ghost feature is a claim about a position. Placing one without knowing the
position would mean inventing a coordinate for a feature whose whole significance
is that it was invented, which repeats the original error in our own voice. The
records exist, they can be read, and they will acquire geometry when the
disputed positions are found in the charts that carried them.

The contract is published ahead of the data so that a reader looking for the
disproved features finds an account of why none can yet be placed, rather than
finding no layer at all.

## Historical scope

1531 to 1916, once the layer holds anything.

## Sources and evidence

Each record keeps four things: who introduced the feature, what was actually
reported, why that was a reasonable thing to record at the time, and what later
evidence said. A record missing any of those cannot be rendered at all.

Two of the five are filed **unresolved** rather than **disproved**, although the
literature reports them as removed from charts. No authority for the removal is
held, and a disproof that cannot name what disproved it is not a disproof.

**No record here attributes a cause.** Saying a feature was later removed is a
record of non-confirmation. Saying it was a mirage, a refracted image or an ice
island misread as land is a much stronger claim that needs its own source, and
the two are routinely conflated.

## Reconstruction and uncertainty

When positions are located, original historical geometry and any modern corrected
geometry will be separate records rather than two states of one line.

## Editorial decisions

The most important record in this set was claimed by James Clark Ross, the most
careful observer in the whole programme, working in polar air where distance and
elevation are famously hard to judge. A ghost attributable to a careless witness
teaches nothing. One attributable to Ross is the entire point.

## Data fields

`evidenceClass`, `geometryProvenance`, `confidence`, `reviewState` and `act`. See
[the Antarctic data fields](/atlas/handbook/data-fields/antarctica/).

## Data and downloads

CC BY 4.0 for the compiled records. In review, and currently empty.
