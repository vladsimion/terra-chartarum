---
id: layer-venetian-ports
title: 'Venetian maritime ports, c.1200-1500'
summary: The nodes of the stato da màr, each phase a separate feature - and a trading quarter is never drawn as a colony.
docType: layer
pattern: B
programme: vmn
layerId: venetian-ports
lifecycle: published
lastReviewed: '2026-08-23'
referencesDocIds:
  - evidence-vmn-sources
  - data-fields-vmn
relatedLayerIds:
  - venetian-routes
  - venetian-possessions
relatedCollectionIds:
  - venetian-maritime-network
relatedEssaySlugs:
  - venice-sicily
citation:
  version: 'venetian-ports-vmn3'
  licence: 'CC BY'
technicalLinks:
  - label: VMN data dictionary
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/vmn/data-dictionary.md'
  - label: Source log
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/vmn/source-log.md'
  - label: Deep-link guide
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/vmn/deep-links.md'
---

## What you are looking at

The harbours of the Venetian maritime state between roughly 1200 and 1500: the
metropole, its regional capitals, colonies, protectorates, subject cities, the
quarters Venice held inside other powers' cities, and the rival Genoese
establishments that shaped where Venice could go.

## How to read this layer

Symbol size follows `status`, which is a port's relationship to Venice - not its
population or its trade volume. A large symbol means close subordination, not a
large place.

**The status vocabulary is the argument.** A `commercial_quarter` is rights in
another power's city; a `colony` is rule over a place. Drawing both as "Venetian"
would produce the empire Venice is usually imagined to have had rather than the
one it ran. The full vocabulary is in
[the VMN data fields](/atlas/handbook/data-fields/vmn/).

Each phase is a separate feature, so the year slider shows the arrangement in
force rather than every harbour Venice ever touched.

## Historical scope

c.1200 to 1500, phased per feature.

## Sources and evidence

Compiled after Lane's _Venice: A Maritime Republic_ (1973) and O'Connell's
_Men of Empire_ (2009), with page-level locators on every claim. The full list of
authorities and the citation rules are in
[the VMN source log](/atlas/handbook/evidence/vmn-sources/).

## Reconstruction and uncertainty

Harbour positions are modern locations of the historical places and are not in
serious doubt. What is uncertain is **status and date**: the year a relationship
changed is often a matter of which instrument you count, and the boundaries
between `protectorate`, `feudatory` and `subject` were not always clear to
contemporaries either.

Where a source gives a range rather than a date, the phase takes the range.

## Editorial decisions

**Rivals are drawn.** Genoese establishments appear on a Venetian layer because
a network is defined by what it could not reach as much as by what it held.

**Quarters are drawn as points, never as territory.** There is no polygon for a
merchant quarter on this atlas.

## Data fields

`status` drives the symbol; every feature carries its validity range and source
keys. See [the VMN data fields](/atlas/handbook/data-fields/vmn/).

## Data and downloads

FlatGeobuf under CC BY from the content-addressed release. Attribution: _Terra
Chartarum; after Lane and O'Connell._
