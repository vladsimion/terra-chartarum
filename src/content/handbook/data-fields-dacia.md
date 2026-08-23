---
id: data-fields-dacia
title: Dacia data fields
summary: The fields the Dacia layers expose as filters, in reader's language - what each value commits to, and what it does not.
docType: data-fields
pattern: B
programme: dacia
routeSlug: dacia
lifecycle: published
lastReviewed: '2026-08-23'
relatedLayerIds:
  - dacia-attestations
  - dacia-attestations-research
  - dacia-roman-sites
  - dacia-roman-network
  - dacia-principalities
  - dacia-josephinian-sheets
  - dacia-treaty-frontiers
relatedCollectionIds:
  - corpus-chartarum-daciae
technicalLinks:
  - label: CCD data dictionary (full machine schema)
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/dacia/data-dictionary.md'
---

## Why these are worth reading

Every filter on a Dacia layer is a scholarly claim compressed into a word. This
page says what each word commits to. The full machine schema - column types,
identifier formats, compile contracts - stays in the repository, because it
answers a different question.

## Confidence

How far the record travels from what a source actually says.

| Value                      | What it means                                                            |
| -------------------------- | ------------------------------------------------------------------------ |
| `direct`                   | A source states this. No inference.                                      |
| `high`                     | A short, uncontroversial step from what a source states.                 |
| `medium`                   | A reasoned inference a careful reader might make differently.            |
| `low`                      | A possible reading, kept because discarding it would hide a real option. |
| `editorial_reconstruction` | This project supplied it. No source gives it.                            |

Confidence is about the **fact**. It says nothing about where the shape on the
map came from - that is the next field, and conflating the two is the single
easiest way to misread this atlas.

## Geometry provenance

Where the shape came from, kept deliberately separate from confidence.

| Value                      | What it means                                                               |
| -------------------------- | --------------------------------------------------------------------------- |
| `corpus_reference`         | The corpus's own reference position for a place. Not an excavated centroid. |
| `joined_from_stations`     | A line drawn through attested points, in their attested order.              |
| `editorial_reconstruction` | Drawn by this project because the argument needed a shape.                  |
| `reconstructed_footprint`  | A sheet or coverage outline rebuilt rather than taken from an index.        |

A well-attested fact can carry a drawn geometry. When it does, the atlas says
so, rather than letting the confidence of the fact lend itself to the line.

## Line type, on the frontier layer

| Value            | What it means                       |
| ---------------- | ----------------------------------- |
| `treaty_line`    | A frontier an instrument fixed.     |
| `proposal`       | A line put forward and not adopted. |
| `reconstruction` | A later scholarly redrawing.        |

These drive dash pattern and line width as well as colour, so the distinction
survives for readers who do not see the hues. A proposal reads thin and dotted;
a treaty line solid and heavy.

## Attestation class, on the CND layers

What a source does about a place, including when it does nothing.

| Value       | What it means                                                     |
| ----------- | ----------------------------------------------------------------- |
| `names`     | The source names the place.                                       |
| `describes` | The source describes it without naming it.                        |
| `silent`    | The source could have named it and did not. Recorded as evidence. |
| `ambiguous` | The source names something that may or may not be this place.     |

Silence is data here. A source that surveys a region and omits a settlement is
telling you something, and the corpus records it rather than leaving a gap that
looks like an oversight.

## Review state

| Value        | What it means                                           |
| ------------ | ------------------------------------------------------- |
| `pending`    | Compiled and untouched by a human.                      |
| `normalized` | Machine-assisted work has taken it as far as it may go. |
| `reviewed`   | A named person cleared it against a real locator.       |

Machine-assisted research stops at `normalized` by construction: the validator
refuses to promote it without a named reviewer and a real locator. Nothing in
the corpus is `reviewed` yet, and that is the gate working rather than failing.

## Sovereignty and suzerain, on the principality layer

`sovereignty` records what kind of authority held the ground - direct rule,
tributary autonomy, occupation, condominium. `suzerain` names the overlord where
one existed. The two are separate because a principality could change its
overlord without changing its internal arrangements, and drawing that as one
field would flatten most of the period.
