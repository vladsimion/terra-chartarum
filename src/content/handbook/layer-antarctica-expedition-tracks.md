---
id: layer-antarctica-expedition-tracks
title: Antarctic expedition tracks
summary: A planned crossing, a voyage under sail and a drift with the ice are three different things, and the line tells you which.
docType: layer
pattern: B
programme: antarctica
layerId: antarctica-expedition-tracks
lifecycle: in-review
lastReviewed: '2026-08-29'
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
  - label: Endurance navigation dataset
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/antarctica/endurance-navigation.md'
  - label: Antarctic data dictionary
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/antarctica/data-dictionary.md'
---

## What you are looking at

Five lines: a sampled stretch of Cook's second voyage, the approach of Endurance
into the Weddell Sea, the trans-Antarctic crossing that was announced and never
sailed, the drift of the beset ship, and the James Caird passage to South
Georgia.

## How to read this layer

Read the dash pattern before the shape. It says where the line came from, not
what happened along it:

| Line      | Where it came from                        |
| --------- | ----------------------------------------- |
| Solid     | Positions a source gives, joined in order |
| Long dash | A generalisation Terra Chartarum drew     |
| Fine dot  | An interpolation Terra Chartarum drew     |

Most of what you see is dashed or dotted. That is the honest state of this
dataset, and it will change as positions are compiled from the sources. One line
is solid: the James Caird passage, whose vertices are the noon positions in
Worsley's log.

The planned crossing is the one line here that nothing ever travelled. It is
filed as interpolation and drawn as such, so it cannot be read as a record of
anything except an intention.

## Historical scope

1773 to 1916.

## Sources and evidence

Cook's track resolves to the journals; the Endurance lines resolve to Shackleton's
published account and to the reanalysis of Worsley's logbook. Four of the five
locators are still pending and those lines are at `raw`. The James Caird passage
is not: its positions were read out of the published transcription of Worsley's
navigational log (Bergman, Huxtable, Morris and Stuart, _Records of the
Canterbury Museum_ 32: 23-66, 2018) and it is at `normalized` - read against the
source, not yet reviewed by a person.

## Reconstruction and uncertainty

The drift is currently two endpoints joined by a straight line, which the drift
certainly was not. It exists to prove the model can hold a drift as a different
kind of thing from a voyage, and it is not a route anyone should measure.

The James Caird was the same kind of placeholder - three points of which the
middle was ours - and is not any longer. It is now fifteen vertices: the
departure position and the noon position the log gives for each day of the
passage. Two limits stand even so. A noon-to-noon line says nothing about the
path between two noons, and nine of the fourteen noons are reckoned rather than
observed, which is why the line is filed as dead reckoning. The line stops at
8 May 1916, the last position the log works; the landing two days later has no
position in the log.

## Editorial decisions

A drift is not a voyage. When Endurance was beset the ship's position went on
changing for nine months while nobody steered anything, and the data model
carries that as a property of the phase rather than as a note in a caption. No
line in this layer that we drew is rendered as though a source had given it.

## Data fields

`evidenceClass`, `geometryProvenance`, `confidence`, `reviewState` and `act`. See
[the Antarctic data fields](/atlas/handbook/data-fields/antarctica/).

## Data and downloads

CC BY 4.0 for the compiled records. In review: not citable as established
evidence.
