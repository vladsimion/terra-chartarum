---
id: data-fields-vmn
title: Venetian Maritime Network data fields
summary: What a port's status, a route's type and a possession's phase each commit to - the vocabulary that makes the VMN layers readable.
docType: data-fields
pattern: B
programme: vmn
routeSlug: vmn
lifecycle: published
lastReviewed: '2026-08-23'
relatedLayerIds:
  - venetian-ports
  - venetian-routes
  - venetian-possessions
relatedCollectionIds:
  - venetian-maritime-network
technicalLinks:
  - label: VMN data dictionary (full machine schema)
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/vmn/data-dictionary.md'
---

## Status, on the ports layer

A port's `status` is its relationship to Venice at that moment, and it drives
the symbol size. Because the data is phased, the same harbour appears several
times with different statuses as the relationship changed.

| Status                                          | What it means                                                               |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| `metropole`                                     | Venice itself.                                                              |
| `capital`                                       | The administrative head of a region of the stato da màr.                    |
| `colony`                                        | Directly ruled overseas territory.                                          |
| `protectorate`                                  | Local rule under Venetian protection.                                       |
| `subject`                                       | A subject city within the mainland or maritime state.                       |
| `metropolitan_quarter`                          | A Venetian quarter inside another power's capital.                          |
| `commercial_quarter`                            | A trading quarter with privileges, not territory.                           |
| `rival_genoese`                                 | Held by Genoa - drawn because the network is defined partly by rivalry.     |
| `leased`, `feudatory`                           | Held on terms from another power, or by a family under Venetian suzerainty. |
| `contested`                                     | Changing hands, or claimed by more than one power in this phase.            |
| `foreign_port`, `trading_post`, `crusader_port` | Not Venetian, but part of the network's traffic.                            |
| `staging`                                       | A stop on a convoy route without a permanent establishment.                 |
| `lost`                                          | Formerly held, and no longer.                                               |

**A quarter is not a colony.** The distinction between `commercial_quarter` and
`colony` is the difference between rights in someone else's city and rule over a
place, and it is the distinction the ports layer exists to keep visible.

## Route type, on the routes layer

| Value     | What it means                                                               |
| --------- | --------------------------------------------------------------------------- |
| `muda`    | A state-organised convoy on a documented, regulated schedule.               |
| `private` | A round-ship trade sailing on commercial terms rather than by state decree. |

`muda` lines render solid and `private` dashed, so the distinction survives
without colour.

**A route line is a relation, not a track.** It shows that a convoy ran between
these harbours, in this order. It does not show the course any ship sailed, and
the line will cross land features that no galley went near.

## Phases and dates

Every feature carries a `valid_from` and `valid_to`, and the year slider filters
individual features rather than the whole layer. An open-ended record compiles
to `valid_to = 9999`. A port that was Venetian from 1204 and lost in 1358 is two
features, not one with a note.

## Source keys and locators

Each feature cites its sources by key, and a key may carry a page-level locator -
`LANE1973:p436` means page 436 as printed in Lane's 1973 first edition. Locators
are printed page numbers, never scan sequence numbers. Front matter without
printed folios uses named locators such as `chronology` rather than a guessed
roman numeral.

The full list of authorities is in
[the VMN source log](/atlas/handbook/evidence/vmn-sources/).
