---
id: layer-venetian-possessions
title: 'Venetian possessions, c.1200-1500'
summary: Territorial extent of the stato da màr as phased fills clipped to the coastline - the layer most easily mistaken for sovereignty, and the one that claims least.
docType: layer
pattern: B
programme: vmn
layerId: venetian-possessions
lifecycle: published
lastReviewed: '2026-08-23'
referencesDocIds:
  - evidence-vmn-sources
  - data-fields-vmn
relatedLayerIds:
  - venetian-ports
  - venetian-routes
relatedCollectionIds:
  - venetian-maritime-network
relatedEssaySlugs:
  - venice-sicily
citation:
  version: 'venetian-possessions-vmn3'
  licence: 'CC BY'
technicalLinks:
  - label: VMN data dictionary
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/vmn/data-dictionary.md'
  - label: Source log
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/vmn/source-log.md'
---

## What you are looking at

The ground the Republic held overseas, as dated fills: direct rule,
protectorates, condominia and contested territory, clipped to the coastline.

## How to read this layer

**This is the layer most likely to mislead you, and it is off by default in the
Venetian collection for that reason.**

A filled polygon on a modern map reads as sovereignty in the modern sense -
uniform authority to a surveyed edge. What Venice held was mostly ports,
fortresses and their hinterlands, with authority that thinned inland and varied
by agreement. The fills show approximately what was held. They do not show a
boundary anyone patrolled, and their inland edges are the least reliable thing
on the layer.

Read it next to the ports layer, which is where the network's actual structure
is legible.

## Historical scope

c.1200 to 1500, phased per feature.

## Sources and evidence

After Lane 1973 and O'Connell 2009, with page-level locators. See
[the VMN source log](/atlas/handbook/evidence/vmn-sources/).

## Reconstruction and uncertainty

The extent geometry is editorial. Coastal clipping is a cartographic decision,
not a claim that authority stopped at the shoreline - it stops the fills bleeding
into water where they would assert control over sea lanes.

Condominia are the hardest case: territory administered jointly, or claimed by
two powers at once, cannot be shaded as belonging to one of them, and where the
sources describe a condominium the phase records it as such rather than choosing.

## Editorial decisions

**Contested ground is drawn as contested**, not assigned. Where sources
disagree about who held a place in a given decade, the phase records the dispute.

## Data fields

Every feature carries its validity range, its status and its source keys. See
[the VMN data fields](/atlas/handbook/data-fields/vmn/).

## Data and downloads

FlatGeobuf under CC BY. Attribution: _Terra Chartarum; after Lane and O'Connell._
