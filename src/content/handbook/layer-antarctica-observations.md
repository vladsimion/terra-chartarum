---
id: layer-antarctica-observations
title: Antarctic observations and fixes
summary: Nineteen dated positions from Cook to the loss of Endurance, sized by how well each one is actually known.
docType: layer
pattern: B
programme: antarctica
layerId: antarctica-observations
lifecycle: in-review
lastReviewed: '2026-08-29'
referencesDocIds:
  - data-fields-antarctica
relatedLayerIds:
  - antarctica-expedition-tracks
  - antarctica-ghost-geographies
relatedCollectionIds:
  - terra-incognita
citation:
  version: 'ant-pilot-0.1'
  licence: 'CC BY 4.0'
technicalLinks:
  - label: The discovery era
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/antarctica/discovery-era.md'
  - label: Antarctic data dictionary
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/antarctica/data-dictionary.md'
---

## What you are looking at

Dated positions: farthest souths, the contested sightings of 1820 and 1840, the
nineteenth-century landfalls, and the Endurance sequence from besetment to South
Georgia.

## How to read this layer

Circle size is confidence, not importance. A large circle means the record is
well established. Nothing here is large.

The evidence class matters more than the position. Several 1820 and 1840 records
are filed as **reported** rather than **observed**, and that is not a doubt about
whether the ships were where they said they were. It is a statement that what was
seen, and whether it counts as a sighting of the mainland rather than of an ice
front, is a question the historiography has not settled. The data model refuses
to settle it by choosing a field.

Some records are dated to the month rather than the day. That is also deliberate:
the exact days of the January 1840 sightings are part of the dispute between the
American and French expeditions, and pinning them here would resolve that dispute
in a spreadsheet.

## Historical scope

1774 to 1916.

## Sources and evidence

Each position names the source it should be read from. Most are recorded from
the general literature with the locator still pending, which is why they have not
left the raw state.

The James Caird passage is the exception, and it is the shape the rest should
eventually take. Its nineteen noon positions were read out of the published
transcription of Worsley's navigational log (Bergman, Huxtable, Morris and
Stuart, _Records of the Canterbury Museum_ 32: 23-66, 2018), each carrying the
class the log itself gives it: observed with an instrument, or reckoned from
course, speed and time. On the five days that have both, both are kept as
separate records, because the distance between them is the evidence - on
26 April 1916 it is seventy-eight nautical miles. Those rows are at `normalized`:
read against the source, not yet reviewed by a person.

## Reconstruction and uncertainty

No uncertainty envelope is drawn, because none has been established.

The Endurance sinking position deserves particular care. The figure is a
_calculated result_: an observation, an instrument, an assumption and an
arithmetic, each with its own error. It has been recomputed from Worsley's
logbook in the navigation literature, and that recomputation is the source it
should be cited from. Presenting the coordinate as a simple fact would undo the
argument the record exists to make.

## Editorial decisions

Positions are stored at the precision the literature reports and no further. The
build rounds coordinates only to keep its own bytes stable, and that rounding is
not a claim about accuracy.

## Data fields

`evidenceClass`, `geometryProvenance`, `confidence`, `reviewState` and `act`. See
[the Antarctic data fields](/atlas/handbook/data-fields/antarctica/).

## Data and downloads

CC BY 4.0 for the compiled records. In review: not citable as established
evidence.
