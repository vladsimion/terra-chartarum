---
id: layer-dacia-roman-network
title: 'Roman Dacia: roads and frontier corridors'
summary: The province as a network - roads joined through attested stations, and limes corridors this project drew. The dashes say which is which.
docType: layer
pattern: B
programme: dacia
layerId: dacia-roman-network
lifecycle: published
lastReviewed: '2026-08-23'
referencesDocIds:
  - method-dacia-shared-gis
  - data-fields-dacia
relatedLayerIds:
  - dacia-roman-sites
  - roman-empire-117
relatedCollectionIds:
  - corpus-chartarum-daciae
  - roman-geography
relatedEssaySlugs:
  - dacia
citation:
  version: 'dacia-roman-network-kan341'
  licence: 'CC BY 4.0'
technicalLinks:
  - label: Shared GIS methodology
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/dacia/shared-gis-layers.md'
---

## What you are looking at

Two things in one layer, told apart by line style: the road network of the
province, and the frontier corridors of the limes.

## How to read this layer

**Nothing here is digitised from a survey.**

A **road** is a line joining attested stations in their attested order. It shows
that these places were connected in this sequence. It does not show where the
road ran between them, and it will cut across terrain that any real road went
around.

A **limes corridor** is a band this project drew to show roughly where the
frontier works lay. It is not a line of fortifications traced from the ground.

Roads render solid, corridors dashed, and the two carry different widths, so the
distinction survives without colour.

## Historical scope

AD 106 to 271.

## Sources and evidence

Road courses derive from the station sequences in the corpus, which rest on the
itineraries and the standard road literature. The limes corridors are editorial
throughout, drawn from published accounts of the frontier works.

## Reconstruction and uncertainty

This is the layer on the Dacia map where the gap between evidence and geometry
is widest, which is why the styling makes the gap visible rather than putting it
in a footnote. A reader should be able to tell at a glance which lines are
inferences from attested points and which are this project's drawing.

See [the shared Dacia GIS method](/atlas/handbook/methods/dacia-shared-gis/) for
the rule behind that.

## Data fields

`feature_type`, `confidence`, `geometry_provenance` and `review_status`. See
[the Dacia data fields](/atlas/handbook/data-fields/dacia/).

## Data and downloads

GeoJSON under CC BY 4.0. Attribution: _Terra Chartarum; roads joined from corpus
stations, frontier corridors drawn editorially._
