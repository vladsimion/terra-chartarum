---
id: data-fields-hanseatic
title: Hanseatic data fields
summary: Participation classes, evidence types and certainty - the vocabulary that lets the Hanseatic layers show how well attested each thing is.
docType: data-fields
pattern: B
programme: hanseatic
routeSlug: hanseatic
lifecycle: published
lastReviewed: '2026-08-23'
relatedLayerIds:
  - hanseatic-places
  - hanseatic-routes
  - hanseatic-events
relatedCollectionIds:
  - hanseatic-world
technicalLinks:
  - label: HSE data dictionary (full machine schema)
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/hanseatic/data-dictionary.md'
---

## Participation, on the places layer

What a place's relationship to the League actually was. It drives symbol size,
and it is phased: a city's role changed, and each phase is its own feature.

| Role               | What it means                                                        |
| ------------------ | -------------------------------------------------------------------- |
| `leading_city`     | A city that convened and directed - Lübeck above all.                |
| `active_city`      | A regular participant in Hansetage and common action.                |
| `represented_city` | Present through a representative rather than in its own right.       |
| `kontor`           | A permanent overseas establishment with its own statutes.            |
| `foreign_branch`   | A Hanseatic presence inside another jurisdiction, short of a Kontor. |
| `associated_town`  | Tied to a member city without full participation.                    |
| `market`           | A place of Hanseatic trade without institutional membership.         |

**Membership was not a binary.** The League never had a definitive roster, and
cities drifted in and out. These classes record what the sources show a place
doing, not a status it formally held.

## Evidence type, on the routes layer

How well attested a corridor is. It drives line width, so evidence strength is
visible on the map.

| Value                            | What it means                                               |
| -------------------------------- | ----------------------------------------------------------- |
| `documented_route`               | Sources describe traffic on this corridor directly.         |
| `repeated_commercial_connection` | Repeated trade between the endpoints; the path is inferred. |
| `generalized_reconstruction`     | A plausible corridor drawn to show a connection existed.    |

A wide line means the evidence is strong, not that the traffic was heavy.

## Certainty

`certainty` (`high`, `medium`, `low`) drives the dash pattern on corridors and
the symbol size on events. It is separate from `evidence_type`: a corridor can be
a generalised reconstruction that everyone agrees existed, or a documented route
whose dating is disputed.

## Event type, on the events layer

Privileges granted, confirmed and restricted; embargoes; conflict; peace
treaties; Hansetage; Kontor rules, relocations and closures; and institutional
afterlives - what persisted once the League stopped meeting.

These are institutional acts at named places. They are filed under places rather
than under conflict because that is what most of them are: the League's history
is largely a history of privileges being negotiated, confirmed and lost.

## Names

Every place carries both its historical and its modern name, and the Atlas search
matches either. A city that appears in the sources as _Reval_ is searchable as
Tallinn and displays both, because pretending the modern name is the historical
one is how a map quietly rewrites its sources.
