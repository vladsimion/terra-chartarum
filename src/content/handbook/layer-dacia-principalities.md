---
id: layer-dacia-principalities
title: 'Principalities and provinces, 1526-1859'
summary: Wallachia, Moldavia and Transylvania as dated phases rather than one timeless outline - and the rings are editorial envelopes, not delimitations.
docType: layer
pattern: B
programme: dacia
layerId: dacia-principalities
lifecycle: published
lastReviewed: '2026-08-23'
referencesDocIds:
  - method-dacia-shared-gis
  - data-fields-dacia
relatedLayerIds:
  - dacia-treaty-frontiers
relatedCollectionIds:
  - corpus-chartarum-daciae
relatedEssaySlugs:
  - dacia
citation:
  version: 'dacia-principalities-kan342'
  licence: 'CC BY 4.0'
technicalLinks:
  - label: Shared GIS methodology
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/dacia/shared-gis-layers.md'
---

## What you are looking at

Twelve territorial phases across six polities, covering the three hundred years
between Mohács and the union of the principalities. Habsburg Oltenia, Bukovina
and Russian Bessarabia appear when they existed and not before.

## How to read this layer

The point of the phasing is that there is no single "Wallachia" shape. A
principality that changed overlord, lost a province and regained it is drawn as
several dated features, and the year slider shows you which arrangement was in
force.

`sovereignty` records what kind of authority held the ground; `suzerain` names
the overlord where there was one. Tributary autonomy under the Porte is not the
same as direct rule, and the layer keeps them apart rather than colouring both
as "belonging to".

## Historical scope

1526 to 1859, as dated phases. Each feature carries its own validity range.

## Sources and evidence

Territorial phases after Hertslet, _The Map of Europe by Treaty_, with the
standard regional literature behind the internal arrangements. The instruments
that moved these boundaries after 1829 are documented in
[the treaty frontier ledger](/atlas/handbook/evidence/dacia-treaty-frontiers/).

## Reconstruction and uncertainty

**These rings are envelopes, not delimitations.** They show roughly what was
held, at a scale where the answer is meaningful, and they are not survey
boundaries. Mountain and steppe margins are the least reliable parts of any of
them - authority there was a function of routes, seasons and tribute rather than
of a line.

The geometry is editorial throughout. See
[the shared Dacia GIS method](/atlas/handbook/methods/dacia-shared-gis/) for the
rule the whole family is built on.

## Data fields

`polity_id`, `sovereignty`, `suzerain`, `confidence` and `review_status` are
filterable. Their meanings are in
[the Dacia data fields](/atlas/handbook/data-fields/dacia/).

## Data and downloads

GeoJSON under CC BY 4.0. Attribution: _Terra Chartarum; territorial phases after
Hertslet, The Map of Europe by Treaty._
