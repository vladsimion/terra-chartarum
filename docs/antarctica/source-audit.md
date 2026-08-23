# Antarctic source, bibliography and rights audit (KAN-420)

The research foundation for TERRA INCOGNITA, built before any public prose or
map interaction depends on an object nobody has identified.

Tables: `data/antarctica/sources.csv`, `map-objects.csv`, `source-gaps.csv`.

## What the audit holds

Thirty sources across eleven claim families, seventeen candidate map objects,
and sixteen recorded gaps.

The bibliography is grouped by argument rather than alphabetically, because the
question a reader has is never "what has been published about Antarctica" but
"what supports this sentence". Every source carries the act it serves and the
claim family it belongs to, and the validator refuses the dataset if any of the
five clusters the specification requires - Coronelli, Cook, discovery priority,
the cumulative synthesis, Endurance navigation - has no source at all.

## What verification means here

Three states, and the distinction between them is the point of the audit.

- **verified** - the catalogue record or edition was opened during this audit and
  the fields were transcribed from it.
- **partially_verified** - the object's identity was established from an
  authoritative search result, but the record itself was not opened.
- **unverified** - recorded from scholarly knowledge and not yet checked against
  any catalogue.

Two objects are verified: the 1777 southern-hemisphere chart at Greenwich
(PAI4123) and the 1910 cumulative ice chart (G288:1/2(2)). Both catalogue
records were read and both are transcribed exactly, including two facts that
change the argument. The Cook chart is credited to William Whitchurch as
engraver, which the essay should not silently replace with Cook's name. And the
Greenwich record dates the ice chart 1910 _and_ 1874, which means the cumulative
sheet is itself a reissue of an earlier compilation, and the layered archive of
Act VII is literal rather than metaphorical.

Everything else is unverified or partially verified. A rule enforces the obvious
consequence: a source may not be marked verified while its locator is still
pending, because knowing a book exists is not having read a page of it.

## Rights

No object in the register is cleared for reproduction. The register separates
the rights of the _work_ from the rights of the _scan_, and the two verified
objects show why: both are long out of copyright as engravings, and neither
catalogue record states any reuse licence. The ice chart carries a Crown
copyright credit line. Both are therefore `research_only` until Royal Museums
Greenwich answers in writing.

The validator will refuse any row that claims a reproduction use without open
rights, a verified identity and a named scan source. Dealer and auction listings
are refused as a source of record outright.

## The gaps

Sixteen, all open, each naming what it blocks and what would close it. The four
that matter most:

1. **The Coronelli plate has not been seen.** The Rumsey record returned an
   access check. Act III's central object is unexamined, and search evidence
   suggests the plate may be weighted towards the Arctic - which, if true, is
   the finding rather than an obstacle to it.
2. **Worsley's navigational records have not been located.** Until they are,
   every Endurance position is taken from a published narrative, and the
   distinction between a fix and a reckoning cannot be made at all.
3. **The 2022 wreck position is unheld.** The expedition site returned 403 and
   the Antarctic Treaty historic-site entry could not be retrieved. Secondary
   reporting seen during the audit used one set of coordinates for both the
   reported 1915 position and the wreck, and then quoted a separation between
   them, which cannot all be true.
4. **No Wilkes sheet has been identified.** The programme's flagship
   ghost-geography case currently rests on a general recollection.
