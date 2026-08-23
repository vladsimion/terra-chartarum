---
id: glossary
title: Glossary
summary: The words this atlas uses about evidence, reconstruction and uncertainty, and what each of them commits to.
docType: glossary
pattern: B
programme: atlas
lifecycle: published
lastReviewed: '2026-08-23'
---

## How this glossary works

These are not general definitions. Each entry says what the term means **on this
atlas** and, where it matters, what it deliberately does not mean. Where a term
is a controlled value in the data, it is written in `code`.

## Roles: what kind of claim a layer makes

**`context`** - framing geography that asserts nothing about the past.
Coastlines, rivers, present-day borders. A context layer cannot carry a
historical category; the schema refuses it.

**`historical`** - a reconstruction of a past state. The scholarly payload of
the atlas, and the only kind of layer that can be cited as a claim about what
was there.

**`evidence`** - what a source depicts or covers. A depicted extent is evidence
about a map, not about the ground it draws.

**`map-overlay`** - a georeferenced historical map surface, shown as an image
rather than as data.

## Lifecycle: what state the scholarship is in

**`published`** - the editorial contract is settled. It does not mean the layer
has data: a published layer can ship an empty asset while it waits for review,
and asset availability is a separate question the release manifest answers.

**`in-review`** - the records exist and no human has cleared them. Material in
this state may be looked at and argued with; it may not be cited as established
evidence.

**`in-preparation`**, **`planned`** - declared but not compiled. These do not
appear in the layer browser.

## Confidence and provenance

**`direct`** - a source states the thing itself.

**`high` / `medium` / `low`** - decreasing degrees of inference from what a
source states to what the record claims.

**`editorial_reconstruction`** - this project drew it. Nothing in the sources
gives the geometry, and the line exists because the argument needed one.

**`geometry_provenance`** - where a shape came from, kept separate from how
confident anyone is about the fact it represents. A well-attested fact can carry
a drawn geometry, and the atlas says so rather than letting a confident fact
lend its confidence to an invented line.

## Reading the frontier layers

**`treaty_line`** - a boundary an instrument fixed.

**`proposal`** - a line somebody put forward that was not adopted. Kept, rather
than discarded, because a rejected frontier is evidence about what was thought
possible.

**`reconstruction`** - a later scholarly redrawing.

Where two sources give different lines for one moment, both are kept. Averaging
them would produce a frontier nobody proposed.

## Attestation and silence

**`attestation`** - a place where a source names a place.

**Silence** - a place where a source could have named a place and did not.
Silences are recorded as data because absence in a source is a fact about that
source.

**`review_state`** - whether a human has cleared a record. Machine-assisted work
stops at `normalized` by construction; nothing reaches `reviewed` without a
named reviewer and a real locator.
