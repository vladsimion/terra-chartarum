---
id: data-fields-antarctica
title: Antarctic data fields
summary: What the Antarctic layers commit to when they call something conjectured, reported, observed or drawn by us.
docType: data-fields
pattern: B
programme: antarctica
routeSlug: antarctica
lifecycle: in-review
lastReviewed: '2026-08-23'
relatedLayerIds:
  - antarctica-pilot-tracks
  - antarctica-pilot-observations
technicalLinks:
  - label: Antarctic data dictionary (full machine schema)
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/antarctica/data-dictionary.md'
  - label: Discovery terminology
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/antarctica/claim-ledger.md'
---

## Why these fields exist

The Antarctic material is an argument about maps made when there was nothing to
observe, when what was observed was disputed, and when the ground itself was
moving. That argument only holds if the difference between a guess, a report, a
sighting and our own drawing is carried by the data rather than by the prose
beside it. These are the fields that carry it.

## Evidence class

What kind of claim a record makes. The stored values do not change; only the
labels a page shows may.

| Value                      | What it means                                                          |
| -------------------------- | ---------------------------------------------------------------------- |
| `conjectured`              | Drawn because theory implied it should exist, with no report behind it |
| `inherited_cartography`    | Taken from an earlier map rather than from any new information         |
| `reported_not_observed`    | Represented from testimony that was not independently confirmed        |
| `direct_observation`       | Seen by a named expedition on a stated date                            |
| `instrumental_fix`         | A position from a celestial observation and a timekeeper               |
| `dead_reckoning`           | A position inferred at the time from course, speed and elapsed time    |
| `scholarly_reconstruction` | Reconstructed by later scholarship                                     |
| `editorial_interpolation`  | Supplied by Terra Chartarum to join records the sources leave apart    |
| `later_confirmation`       | Evidence that a claim held                                             |
| `later_disproof`           | Evidence that it did not                                               |

Two of these are worth holding apart carefully. **Dead reckoning** is a
historical act: a navigator inferred a position and recorded it, and that
inference is evidence. **Editorial interpolation** is ours, made now, and is
never evidence of anything except our own drawing decision.

Observation is not accuracy either. A record can be a direct observation and
still be wrong; what the class asserts is that somebody looked.

## Geometry provenance

Every line, outline and point declares where its coordinates came from. There
are six answers, plus one for a record that has no geometry at all.

Records drawn by Terra Chartarum, whether generalisation or interpolation, can
never reach the public tier. That is enforced in the build rather than promised
here.

`not_spatial` is a real answer and not a gap. A record about a plate nobody has
examined stays without geometry; the alternative is a point that looks like
knowledge.

## Confidence

`high`, `medium`, `low`, `contested`, `unresolved`.

`contested` and `unresolved` are not weaker versions of `low`. `contested` means
scholarship disagrees, and `unresolved` means the question is open. Neither is
a defect in the record, and a record at either may not be presented to a public
reader as established.

## Review state

`raw`, `normalized`, `reviewed`, `approved`, `published`. A record leaves `raw`
only once its source locator names something a person actually read. Naming a
source is not reading it, and the two are different fields for that reason.

## Later status

`confirmed`, `modified`, `disproved`, `unresolved`, `not_applicable`. Held apart
from the original evidence, so that a feature later removed from the charts
keeps both its claim and its disproof. A disproved feature is a record of what
was reported and believed, and is never stored as merely an error.

## Discovery vocabulary

The words around 1820 do the most damage when they are used loosely, so they are
defined before they are used: sighting, first sighting, first mainland sighting,
ice front observation, first landing and confirmed land are each a different
question. The dataset has no field called discovery, because that word bundles
seeing, recognising, reporting and being believed, and carries a priority
argument with it.
