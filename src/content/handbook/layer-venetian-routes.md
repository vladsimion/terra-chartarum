---
id: layer-venetian-routes
title: 'Venetian galley routes (mude), c.1200-1500'
summary: The documented convoy lines and private trades, routed through their staging ports - relations between harbours, not tracks across water.
docType: layer
pattern: B
programme: vmn
layerId: venetian-routes
lifecycle: published
lastReviewed: '2026-08-23'
referencesDocIds:
  - evidence-vmn-sources
  - data-fields-vmn
relatedLayerIds:
  - venetian-ports
  - venetian-possessions
relatedCollectionIds:
  - venetian-maritime-network
relatedEssaySlugs:
  - venice-sicily
citation:
  version: 'venetian-routes-vmn3'
  licence: 'CC BY'
technicalLinks:
  - label: VMN data dictionary
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/vmn/data-dictionary.md'
  - label: Source log
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/vmn/source-log.md'
---

## What you are looking at

The convoy system: the state-organised _mude_ that sailed on regulated schedules
to Alexandria, Beirut, Flanders, the Black Sea and Romania, and the private
round-ship trades that ran alongside them.

## How to read this layer

**A line is a relation, not a track.** It records that a convoy ran between these
harbours in this order. It does not record the course any ship steered, and it
will cross headlands and islands that every real voyage went around.

Solid lines are _mude_; dashed lines are private trades. The distinction is
institutional: a _muda_ was auctioned, regulated and scheduled by the Republic,
and a private voyage was not.

## Historical scope

c.1200 to 1500, phased per feature. The system did not exist all at once, and
the slider shows which lines were running when.

## Sources and evidence

After Lane 1973, with page-level locators. See
[the VMN source log](/atlas/handbook/evidence/vmn-sources/).

## Reconstruction and uncertainty

The **existence and staging sequence** of a route are documented. Its
**frequency** varied by decade in ways this layer does not attempt to show, and
its **geometry** is drawn through the staging ports rather than reconstructed
from sailing directions.

Reading distance or duration off these lines would be a mistake. The Adriatic
leg of a route drawn straight took as long as the weather allowed.

## Editorial decisions

Routes pass through their staging ports rather than taking great-circle paths,
because the staging ports are the evidence and the water between them is not.

## Data fields

`route_type` drives the dash pattern; every feature carries its validity range
and source keys. See [the VMN data fields](/atlas/handbook/data-fields/vmn/).

## Data and downloads

FlatGeobuf under CC BY. Attribution: _Terra Chartarum; after Lane._
