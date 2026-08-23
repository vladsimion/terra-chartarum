---
id: layer-map-coverage
title: Depicted extents
summary: One footprint per map in the corpus - what each map shows, which is a claim about the map and not about the ground.
docType: layer
pattern: B
programme: atlas
layerId: map-coverage
lifecycle: published
lastReviewed: '2026-08-23'
relatedLayerIds:
  - dacia-josephinian-sheets
relatedEssaySlugs: []
citation:
  version: 'terra-chartarum-coverage'
  licence: 'CC BY'
technicalLinks:
  - label: Coverage asset and release manifest
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/public/geo/manifest.json'
---

## What you are looking at

One polygon for every map in the corpus, marking the area that map depicts. Turn
it on and the atlas stops showing you the world and starts showing you the
collection: where the corpus looks closely, where it looks once, and where it
does not look at all.

## How to read this layer

Every polygon here is a statement about a **document**, not about a place. A
footprint over the Adriatic does not mean anything happened in the Adriatic; it
means a map in this collection draws the Adriatic. Where footprints pile up, the
corpus is dense. Where the map is empty, the corpus is silent - and the silence
is a fact about collecting, cataloguing and survival, not about history.

This is why the layer is classified as `evidence` and not as `historical`. It is
the same distinction the Josephinian sheet index makes for a single survey, and
the two layers answer the same question at different scales.

## Historical scope

The envelope runs from **600 BC to 1972**, which is the span of the corpus
itself rather than of any coherent period. A footprint carries the date of its
map, so filtering by year narrows the layer to the maps made in that window.

## Sources and evidence

The footprints are authored by this project, keyed to the corpus by `mapId`.
They are derived from the map objects' own catalogued coverage, not measured
from georeferenced scans, so they should be read as catalogue metadata that
happens to have a shape.

## Reconstruction and uncertainty

A footprint is a rectangle-ish generalisation of a depicted area, and it is
wrong in three predictable ways.

It **does not record georeferencing precision**. A footprint over Rome says the
map draws Rome; it says nothing about whether any point on that map can be
located to within a kilometre or within fifty.

It **flattens decorative and marginal content**. Early modern maps carry
cartouches, insets and text panels inside the same frame, and the footprint
covers all of it.

It **cannot distinguish depicted from claimed**. A map that draws a territory
and a map that asserts a right to it produce the same polygon. That distinction
belongs to the map record, not to this layer.

## Editorial decisions

The layer is off by default and always will be. It answers a question about the
collection, and a reader who has not asked that question is better served by the
maps themselves.

Footprints are kept as one polygon per map rather than dissolved into a single
coverage surface. A dissolved surface would be prettier and would destroy the
only thing the layer is for, which is knowing how many maps look at a place.

## Data and downloads

Served as GeoJSON under CC BY, attributed to Terra Chartarum. Each feature
carries its `mapId`, which resolves to the map's record in the corpus.
