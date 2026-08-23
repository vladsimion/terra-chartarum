---
id: layer-antarctica-pilot-tracks
title: Antarctic knowledge pilot - tracks and extents
summary: A schematic Terra Australis, a sampled Cook track, and the plan and drift of Endurance. Three of the four lines are ours, and the layer says so.
docType: layer
pattern: B
programme: antarctica
layerId: antarctica-pilot-tracks
lifecycle: in-review
lastReviewed: '2026-08-23'
referencesDocIds:
  - data-fields-antarctica
relatedLayerIds:
  - antarctica-pilot-observations
citation:
  version: 'ant-pilot-0.1'
  licence: 'CC BY 4.0'
technicalLinks:
  - label: Antarctic data dictionary
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/antarctica/data-dictionary.md'
  - label: Source and rights audit
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/antarctica/source-audit.md'
---

## What you are looking at

Four lines from the TERRA INCOGNITA pilot: the region within which early modern
maps drew a southern continent, a sampled stretch of Cook's second voyage, the
crossing the Imperial Trans-Antarctic Expedition announced, and the movement of
Endurance between the day she was beset and the day she was lost.

It is a vertical slice, not a dataset. Four lines exist so that the schema, the
build and the Atlas can be proved end to end before any of them carries real
compiled geography.

## How to read this layer

Read the dash pattern first. It encodes where a line came from, not what it
means:

| Line      | Where it came from                    |
| --------- | ------------------------------------- |
| Solid     | Coordinates transcribed from a source |
| Long dash | A generalisation Terra Chartarum drew |
| Fine dot  | An interpolation Terra Chartarum drew |

Three of the four lines here are dashed or dotted. That is the honest state of a
pilot: the linework is ours, and none of it may be measured.

The southern envelope is deliberately not a coastline. No map in the register has
been examined, so there is nothing to digitise, and drawing a plausible outline
would manufacture exactly the false confidence this essay is about.

## Historical scope

1531 to 1915. The envelope runs from the first generation of printed world maps
to the voyage that bounded it; the Endurance lines sit at the far end of the same
argument, where the problem is no longer an invented continent but a moving
reference frame.

## Sources and evidence

Every record resolves to a source, and every source locator in this slice is
pending. The bibliography is grouped by argument in the audit; nothing in it has
been read against the page.

## Reconstruction and uncertainty

The planned crossing is filed as interpolation rather than observation, because
a route that was never sailed is an intention and our drawing of it is ours. The
drift is two endpoints joined by a straight line, which the drift certainly was
not. Both are present to prove the schema can hold a plan and a drift as
different kinds of thing, and both are replaced when the navigational records
are found.

## Editorial decisions

A record with no geometry stays without geometry. Coronelli's polar plate is part
of this pilot and is absent from the map, because giving an unseen plate a point
would be the error the essay is about, committed in our own voice.

## Data fields

`evidenceClass`, `geometryProvenance`, `confidence`, `reviewState` and `act`. See
[the Antarctic data fields](/atlas/handbook/data-fields/antarctica/).

## Data and downloads

CC BY 4.0 for the compiled records. Each source and map object carries its own
rights status, and no object in this release is cleared for reproduction.
