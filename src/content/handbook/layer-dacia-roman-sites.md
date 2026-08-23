---
id: layer-dacia-roman-sites
title: 'Roman Dacia: principal sites'
summary: Legionary fortresses, road stations and mining centres of the province - every point the corpus's own reference position, and none an excavated centroid.
docType: layer
pattern: B
programme: dacia
layerId: dacia-roman-sites
lifecycle: published
lastReviewed: '2026-08-23'
referencesDocIds:
  - method-dacia-shared-gis
  - data-fields-dacia
relatedLayerIds:
  - dacia-roman-network
  - roman-empire-117
relatedCollectionIds:
  - corpus-chartarum-daciae
  - roman-geography
relatedEssaySlugs:
  - dacia
citation:
  version: 'dacia-roman-sites-kan341'
  licence: 'CC BY 4.0'
technicalLinks:
  - label: Shared GIS methodology
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/dacia/shared-gis-layers.md'
---

## What you are looking at

The principal places of the Roman province: legionary fortresses, auxiliary
forts, road stations, and the mining district that was much of the reason for
the conquest.

## How to read this layer

**Every point is a reference position, not a survey coordinate.** It is the
location the corpus holds for that place, carrying the corpus's own provenance.
None of these is an excavated site centroid, and a point sitting slightly off a
known ruin is the expected behaviour of this dataset rather than an error in it.

Symbol size follows `confidence`, so a place identified directly by a source
reads larger than one placed by inference.

## Historical scope

AD 106 to 271: the conquest under Trajan to the conventional date of the
Aurelianic withdrawal.

## Sources and evidence

Positions come from the Corpus Nominum Daciae. Identifications follow the
Barrington Atlas and _Tabula Imperii Romani_ L-34 and L-35. Where those
authorities disagree about which modern place corresponds to an ancient name,
the corpus records the disagreement rather than picking a winner.

## Reconstruction and uncertainty

The identification of an ancient name with a modern place is the uncertain step
here, more than the coordinate. `confidence` records how firm that step is; the
sources behind each identification are in the corpus record for the place.

## Data fields

`feature_type`, `confidence`, `geometry_provenance`, `region` and
`review_status` are filterable. See
[the Dacia data fields](/atlas/handbook/data-fields/dacia/).

## Data and downloads

GeoJSON under CC BY 4.0. Attribution: _Terra Chartarum; positions from the
Corpus Nominum Daciae; identifications after the Barrington Atlas and TIR
L-34/L-35._
