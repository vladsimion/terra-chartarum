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

Programme vocabularies stay distinct rather than being flattened into one list:
the Dacia corpus, the Venetian network and the Hanseatic world each measure
different things, and a shared word would hide that. Their own terms are in
[Dacia data fields](/atlas/handbook/data-fields/dacia/),
[VMN data fields](/atlas/handbook/data-fields/vmn/) and
[Hanseatic data fields](/atlas/handbook/data-fields/hanseatic/).

## Time

**`valid_from` / `valid_to`** - the years between which a record was true. They
belong to the _feature_, not the layer, so one harbour appears several times with
different dates as its situation changed. An open-ended record compiles to
`valid_to = 9999`.

**Date precision** - how firmly a date is known. A treaty has a day; a
participation phase often has only a decade. Where a source gives a range, the
record takes the range rather than picking its midpoint and looking more certain
than it is.

**Per-feature time** - a property of a layer. When it is on, the year slider
reveals and hides individual features; when off, the slider shows or hides the
whole layer by its overall envelope. Most historical layers here are
per-feature, which is why moving the year changes what is drawn rather than
whether anything is.

**Envelope** - the outer temporal bounds of a whole layer, used to decide
whether it is worth listing at a given year. A layer stays discoverable by its
envelope even when no individual feature falls in the selected year.

## Evidence

**Evidence type** - how directly a thing is attested, as opposed to how
confident we are about it. A documented route and a generalised reconstruction
can both be uncontroversial; they are not equally attested.

**Source locator** - the exact place in a source where a claim rests: a printed
page, a folio, a named section. Locators are printed page numbers, never scan
sequence numbers, and a record that cannot name one may not claim to be
reviewed.

**Reconstruction state** - whether a shape or a reading was taken from a source
or supplied by this project. See `geometry_provenance` below, which records the
same distinction for geometry specifically.

## Identity

**Canonical ID** - the stable identifier for a layer, place, source or record.
It is the same string in the registry, the URL, the citation and the data file.
IDs do not change once published; if a name needs to change, the display title
changes and the ID does not.

**Modern reference versus historical evidence** - the most important
distinction on this atlas. A modern reference layer shows the present day and is
offered as a grid to find your bearings by. A historical layer is a
reconstruction of a past state and can be cited as a claim about it. The schema
enforces the difference: a context layer cannot be filed under a historical
category.

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
