---
id: layer-dacia-attestations
title: Dacia name attestations (reviewed)
summary: Where a source does or does not name a place in the Dacia corpus - carrying only records a human has cleared, which is why it is currently empty.
docType: layer
pattern: B
programme: dacia
layerId: dacia-attestations
lifecycle: published
lastReviewed: '2026-08-23'
referencesDocIds:
  - data-fields-dacia
relatedLayerIds:
  - dacia-attestations-research
relatedCollectionIds:
  - corpus-chartarum-daciae
relatedEssaySlugs:
  - dacia
citation:
  version: 'cnd-0.1-reviewed'
  licence: 'CC BY 4.0'
technicalLinks:
  - label: CCD data dictionary
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/dacia/data-dictionary.md'
  - label: Programme index
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/dacia/README.md'
---

## What you are looking at

Nothing, at present, and that is the layer working correctly.

This layer carries name attestations from the Corpus Nominum Daciae that **a
named person has cleared against a real source locator**. No record has yet been
through that review, so the layer is registered, documented and empty.

## Why an empty layer is published

The contract is what is published here, not the contents. The layer exists so
that the reviewed tier has a stable identity, a stable URL and a stated standard
before anything enters it - rather than appearing later with records already in
it and no public account of what clearing one means.

Everything compiled but uncleared is in
[the research tier](/atlas/layers/dacia-attestations-research/), which is
visible, filterable, and explicitly not citable as established evidence.

## What an attestation is

A record that a source names a place - or that a source which could have named
it did not. Silences are recorded as evidence, because a source that surveys a
region and omits a settlement is telling you something.

## The review gate

Machine-assisted research stops at `normalized` by construction. The validator
refuses to promote a record above that without a named reviewer and a real
locator, and a reviewed record may never carry `pending` where its locator
should be.

This is the largest constraint on the Dacia programme, and it is deliberate.

## Data fields

`attestation_class`, `confidence`, `source_id`, `source_family`, `language`,
`script` and `review_state`. See
[the Dacia data fields](/atlas/handbook/data-fields/dacia/).

## Data and downloads

CC BY 4.0. Each source carries its own rights statement, which governs that
source's material regardless of this licence.
