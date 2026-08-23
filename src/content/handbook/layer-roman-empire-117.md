---
id: layer-roman-empire-117
title: 'Roman Empire, AD 117'
summary: The empire at its greatest recorded reach, drawn as a modern reconstruction of a frontier the Romans did not draw as a line.
docType: layer
pattern: B
programme: atlas
layerId: roman-empire-117
lifecycle: published
lastReviewed: '2026-08-23'
relatedLayerIds:
  - dacia-roman-sites
  - dacia-roman-network
relatedCollectionIds:
  - roman-geography
  - corpus-chartarum-daciae
relatedEssaySlugs:
  - dacia
citation:
  version: 'awmc-roman_empire_ce_117_extent'
  licence: 'ODbL 1.0'
technicalLinks:
  - label: Layer registry entry
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/src/lib/geo.ts'
---

## What you are looking at

A single polygon showing the territory under Roman control at the death of
Trajan in AD 117, the largest extent the empire is recorded as having held. On
this atlas it does one job above all others: it is the frame the Dacia material
is read against. The province whose names, roads and frontiers the Corpus
Chartarum Daciae reconstructs is the northern salient of this shape.

## How to read this layer

Read the edge as a claim about **reach**, not about a border. Rome administered
provinces, garrisoned roads and collected tribute; it did not maintain a
surveyed boundary line of the kind a nineteenth-century treaty produces. The
outline here is a modern cartographic convenience, drawn so that an extent can be
compared with other extents. Where it runs through desert, steppe or mountain it
is at its least meaningful, because control in those places was a function of
routes and seasons rather than of ground.

The layer is a fill, so overlapping it with the modern boundary layer will show
you two incompatible ideas of a border at once. That comparison is worth making
deliberately and worth not mistaking for agreement.

## Historical scope

The layer is registered for **AD 106–271**, which is not the life of the AD 117
extent. Those dates are the life of the province of Dacia: 106, when Trajan
completed its conquest, and 271, the conventional date for its abandonment under
Aurelian. The geometry is a single moment; the envelope is the window in which
that moment is useful context for this corpus. An atlas that showed the AD 117
shape across the whole imperial period would be asserting a stability that the
second and third centuries did not have.

## Sources and evidence

The geometry is the Ancient World Mapping Center's
`roman_empire_ce_117_extent`, produced at the University of North Carolina at
Chapel Hill and derived from the Barrington Atlas of the Greek and Roman World
together with OpenStreetMap base data. It is redistributed here under ODbL 1.0.

This project has not redrawn or adjusted the geometry. What it has done is
decide where the layer sits in the Atlas taxonomy - `historical`, category
`territories-boundaries` - and that decision is the claim it makes here.

## Reconstruction and uncertainty

Three uncertainties travel with this polygon and none of them are visible in it.

The **eastern conquests** of 114–117 - Armenia, Mesopotamia, Assyria - were held
briefly and abandoned almost immediately by Hadrian. A map of AD 117 includes
them; a map of AD 120 does not. The extent shown here is therefore the single
most short-lived configuration the empire ever had, which is exactly why it is
the one usually drawn.

The **frontier zones** were gradients. In North Africa, on the Rhine and Danube,
and along the desert margins, the transition from provincial administration to
client relationship to no relationship at all happened over distances the line
cannot express.

The **client kingdoms** are in or out by editorial convention rather than by
evidence, and different atlases place them differently.

## Editorial decisions

The layer is classified as `historical` rather than `context`. It would be
tempting to treat it as neutral background - it is used as background - but it
is a reconstruction of a past state and carries a scholarly argument, and the
taxonomy reserves `context` for material that asserts nothing about the past.

It is not a member of any collection's default composition except Roman
geography, where it is the whole point. In the Dacia collection it is available
and off, because the province is the subject there and the empire is the frame.

## Data and downloads

The asset is served as GeoJSON from the content-addressed geo release, so a
given URL always returns the same bytes. Attribution must travel with any reuse:
_Ancient World Mapping Center; derived from the Barrington Atlas and
OpenStreetMap (ODbL)_.
