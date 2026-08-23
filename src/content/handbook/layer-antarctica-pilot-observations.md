---
id: layer-antarctica-pilot-observations
title: Antarctic knowledge pilot - observations and fixes
summary: Four dated positions, sized by how well each is known. A sighting is filed as a report wherever what was seen is still argued over.
docType: layer
pattern: B
programme: antarctica
layerId: antarctica-pilot-observations
lifecycle: in-review
lastReviewed: '2026-08-23'
referencesDocIds:
  - data-fields-antarctica
relatedLayerIds:
  - antarctica-pilot-tracks
citation:
  version: 'ant-pilot-0.1'
  licence: 'CC BY 4.0'
technicalLinks:
  - label: Antarctic data dictionary
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/antarctica/data-dictionary.md'
  - label: Claim ledger
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/antarctica/claim-ledger.md'
---

## What you are looking at

Four dated positions from the TERRA INCOGNITA pilot: the farthest south of
Cook's Resolution in January 1774, a sighting reported from the Russian
expedition in January 1820, and the two Endurance positions that bracket the
drift.

## How to read this layer

Circle size is confidence, not importance. A large circle means the record is
well established; a small one means it is contested or unresolved. Nothing here
is large.

The 1820 record is filed as a report rather than an observation. That is not a
doubt about whether the ships were there. It is a statement that what was seen,
and whether it counts as a sighting of the mainland rather than of an ice front,
is exactly the question the historiography has not settled, and the data model
refuses to settle it by choosing a field.

## Historical scope

1774 to 1915.

## Sources and evidence

Each position names the source it should be read from, and every locator is
pending. The positions themselves are recorded from the general literature,
which is why none of them has left the raw state.

The Endurance sinking position is the clearest case. The figure the literature
reports is a calculated result: an observation, an instrument, an assumption and
an arithmetic, each with its own error. Presenting it as a fact would undo the
argument the record exists to make.

## Reconstruction and uncertainty

No uncertainty envelope is drawn, because none has been established. An absent
envelope is better than an invented one; when the navigation research lands, the
envelope becomes a record with a provenance like any other.

## Editorial decisions

Positions are stored at the precision the literature reports and no further. The
build rounds coordinates only to make its own bytes stable, and that rounding is
not a claim about accuracy.

## Data fields

`evidenceClass`, `geometryProvenance`, `confidence`, `reviewState` and `act`. See
[the Antarctic data fields](/atlas/handbook/data-fields/antarctica/).

## Data and downloads

CC BY 4.0 for the compiled records. Each source carries its own rights status.
