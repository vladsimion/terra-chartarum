---
id: layer-dacia-attestations-research
title: Dacia name attestations (research tier)
summary: The full CND 1.0 release candidate, including silences and normalized imports - compiled, filterable, and cleared by nobody. Not citable as established evidence.
docType: layer
pattern: B
programme: dacia
layerId: dacia-attestations-research
lifecycle: in-review
lastReviewed: '2026-08-25'
referencesDocIds:
  - data-fields-dacia
relatedLayerIds:
  - dacia-attestations
relatedCollectionIds:
  - corpus-chartarum-daciae
relatedEssaySlugs:
  - dacia
citation:
  version: 'cnd-1.0-rc1-research'
  licence: 'CC BY 4.0'
technicalLinks:
  - label: CCD data dictionary
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/dacia/data-dictionary.md'
---

## What you are looking at

The whole Corpus Nominum Daciae 1.0 release candidate: every compiled
attestation, including recorded silences and normalized authority imports, with
nothing cleared by human review.

## What you may do with it

Read it, filter it, argue with it, and cite it as _what this project has
compiled_.

**You may not cite it as established evidence.** No record here has been checked
against its source by a named person. Some of it will be wrong in ways only
reading the source will reveal, and the point of publishing it before that
happens is that the errors can be found by someone other than us.

This restriction is why the layer is never on by default and why no collection
may activate it: a reader who opened a collection did not ask to be shown
uncleared material.

## Why a research tier exists at all

It is the point of the research candidate that records can be seen and argued
with before anyone has cleared them. Holding everything until review would
produce a corpus that appears complete on the day it appears, with no public
record of what it looked like on the way.

Every feature carries its `review_state`, so the tier's condition travels with
each record rather than sitting only on this page.

## The two tiers

| Tier                                          | Contains                           | Citable as evidence |
| --------------------------------------------- | ---------------------------------- | ------------------- |
| [Reviewed](/atlas/layers/dacia-attestations/) | Records a named person has cleared | Yes                 |
| This one                                      | Everything compiled                | No                  |

## Data fields

`attestation_class`, `confidence`, `source_id`, `source_family`, `language`,
`script` and `review_state`. See
[the Dacia data fields](/atlas/handbook/data-fields/dacia/).

## Data and downloads

CC BY 4.0. Each source carries its own rights statement.
