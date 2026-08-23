---
id: decision-network-not-territory
title: Why the Hanseatic League has no territory on this map
summary: The League held privileges in places, not ground between them. Drawing it as a polygon would assert the one thing the evidence disproves.
docType: editorial-decision
pattern: B
programme: hanseatic
routeSlug: network-not-territory
lifecycle: published
lastReviewed: '2026-08-23'
relatedLayerIds:
  - hanseatic-places
  - hanseatic-routes
  - hanseatic-events
relatedCollectionIds:
  - hanseatic-world
relatedEssaySlugs:
  - the-league-that-left-no-map
technicalLinks:
  - label: HSE decisions log
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/hanseatic/decisions.md'
---

## The decision

There is no Hanseatic territory layer on this atlas, and there will not be one.
The League is drawn as cities, corridors and events, and never as a shaded area.

## Why

The Hanse was an association of towns, not a state. It had no capital, no
sovereign, no standing army and no border. What it had were **privileges in
places**: the right to trade on particular terms in Bruges, London, Bergen and
Novgorod, and agreements among member cities to act together in defending those
terms.

None of that has an edge. A merchant travelling between two Hanseatic cities
passed through territory belonging to counts, bishops, kings and the Empire, none
of it Hanseatic in any sense. The League's power over that road was the power to
withdraw from it.

Shading the space between the cities would draw exactly the thing that did not
exist. And it would draw it convincingly, because a polygon on a modern map
reads as sovereignty whatever the caption says.

## What we draw instead

**Places**, with an explicit participation class - a leading city, an active
city, a city merely represented at a Hansetag, a Kontor, a foreign branch, an
associated town, a market. These are institutional relationships, and they
changed. A city that attended one diet and never returned is not the same as
Lübeck.

**Corridors**, with an evidence type saying how well attested each one is - a
documented route, a repeatedly evidenced commercial connection, or a generalised
reconstruction. Line width carries that distinction, so the strength of the
evidence is visible on the map rather than buried in a field.

**Events** - privileges granted, confirmed and restricted, embargoes, conflicts,
peace treaties, Hansetage, Kontor relocations and closures. The League's history
is a history of institutional acts at named places, and that is how it is drawn.

## What this costs

Honesty here costs legibility. A territorial blob would be easier to grasp at a
glance and would sit more comfortably beside the Roman and Venetian layers, which
do have extents.

The comparison is the point. Venice ran a maritime empire with governors and
subject cities, and it gets fills - carefully hedged ones. The Hanse ran a
network of privileges, and it gets nodes and edges. Two different kinds of power
should not look the same on a map.

## Where this came from

This is an editorial and historiographical decision, not a technical one, which
is why it is published here rather than left in the repository's decisions log.
That log also records the engineering decisions behind the same layers - file
formats, compile contracts, identifier schemes - and those are not historical
arguments and are not published as though they were.
