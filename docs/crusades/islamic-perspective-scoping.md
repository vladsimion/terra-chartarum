# Scoping note: a Muslim-authored witness for the Holy Land register (KAN-438)

This note exists to correct something before it becomes a data row. A prior
conversation in this repository's history described building an extraction
matrix from Carole Hillenbrand's *The Crusades: Islamic Perspectives*
(Edinburgh University Press, 1999/2000), including chapter-and-section detail
and a claim that the book's PDF was available to work from directly. Neither
was true of this repository at the time: no such file existed here, and
nothing in that matrix was read from it.

**Update:** the user has since supplied a copy (a 704-page scan, read outside
this repository - see "Provenance and rights" below) and the bibliography has
now actually been read against it. The candidate-source list below is
therefore no longer speculative bibliography; it is transcribed from
Hillenbrand's own "Primary Sources" and "Primary Sources in Translation"
lists, with locators. What is still not done - reading any of these sources
themselves, choosing one, and auditing it into `source-audit.csv` - is marked
as such below and is not overstated by this update.

## Provenance and rights

The PDF lives outside this repository (this session's local filesystem only)
and is not committed here, will not be committed here, and is not otherwise
reproduced beyond the short citations quoted below under fair-use-scale
quotation for research purposes. It is a 1999/2000 Edinburgh University Press
monograph and is presumed in copyright; nothing about that changes because a
copy became available to read. The discipline this corpus already applies to
Choniates in `source-audit.csv` (`in_copyright`, `production_role:
research_only`, cited but not reproduced at length) is the model for how
Hillenbrand herself would be handled if she ever needed a row of her own -
which, per the reasoning below, she does not: she cannot be a
`source-audit.csv` row at all, only a finding aid for one.

## The gap, precisely

The Holy Land register in `data/crusades/jerusalem-roles.csv` argues six
things Jerusalem was: a sacred centre, a pilgrimage destination, a described
land, a cartographic construction, a network node, and a later memory. The
sources behind the `textual_construct` and `network_node` records - Burchard
of Mount Sion's *Descriptio Terrae Sanctae* and Marino Sanudo Torsello's
*Liber secretorum fidelium crucis* - are both Latin Christian. `cru-jer-psalter`
and `cru-jer-hereford` are Latin world images. Nothing in
`data/crusades/source-audit.csv` is authored from the perspective of the
people who held Jerusalem and the Levant for most of 1099-1291.

This is a different and prior problem to `vd-cru-arabic-forms`, which is about
place-name forms. That debt can be closed by checking a romanisation against a
reference work. This one cannot: it needs an actual Muslim-authored source
read and audited on the same terms as Burchard and Sanudo, with its own
shelfmark or edition, its own locator, its own `covers` register.

## Candidate primary sources

Transcribed from Hillenbrand's own bibliography (Hillenbrand 1999,
"Bibliography", pp. 617-620 of the printed book = pp. 673-676 of the supplied
PDF scan - the two are a stable 56-page offset apart across this section,
confirmed against the printed running folios). This is a locator into
**Hillenbrand's citation of the source**, not into the source's own text - the
distinction the rest of this corpus already holds Burchard and Sanudo to, and
the reason `verification_state` below is still `unverified` for all four:

- **Ibn al-Qalanisi**, *Dhayl Ta'rikh Dimishq*. Arabic text: no edition of the
  Arabic itself is separately listed (Hillenbrand cites the translation
  directly). English translation: H. A. R. Gibb, *The Damascus Chronicle of
  the Crusades*, London, 1932 (Hillenbrand 1999, p. 619 / PDF p. 675). The
  nearest thing to a contemporary Damascene witness to the First Crusade's
  arrival and the following decades.
- **Ibn al-Athir**, *al-Kamil fi'l-Ta'rikh*. Arabic critical edition: ed. C. J.
  Tornberg, 12 vols, Leiden and Uppsala, 1851-76 (Hillenbrand 1999, p. 617 /
  PDF p. 673). **No English translation appears in Hillenbrand's own
  bibliography** - the modern standard one (D. S. Richards, *The Chronicle of
  Ibn al-Athir for the Crusading Period*, 3 vols, Ashgate, 2006-2008) postdates
  this book and was not and could not have been a source for it. A row drawn
  from Ibn al-Athir today would need to say which edition it actually reads:
  the 19th-century Arabic edition, or the 21st-century Richards translation -
  they are not interchangeable, and Ibn al-Athir writing in the early 13th
  century about the 1090s is itself a witness to later memory as much as to
  the events.
- **Usama ibn Munqidh**, *Kitab al-I'tibar*. Arabic critical editions: ed. P.
  K. Hitti, Princeton, 1930; ed. Q. al-Samarra'i, Riyadh, 1987. English
  translation: P. K. Hitti, *Memoirs of an Arab-Syrian Gentleman*, Beirut,
  1964 (also French translations by Miquel 1983 and Derenbourg 1889;
  Hillenbrand 1999, p. 619 / PDF p. 675). A memoir with direct, often-quoted
  observations of Franks in the Levant - the source most likely to speak to
  lived contact rather than to jihad or Jerusalem as ideas, so the weakest fit
  for the Holy Land register specifically and the strongest fit for a future
  Chapter 6-shaped ("Life in the Levant") gap instead.
- **Baha' al-Din ibn Shaddad**, *al-Nawadir al-Sultaniyya*. English
  translation: C. R. Conder and C. W. Wilson, *The Life of Saladin*, London,
  1897 (Hillenbrand 1999, p. 620 / PDF p. 676) - a Palestine Exploration Fund
  translation, old enough to be out of copyright, unlike the modern standard
  English translation (D. S. Richards, *The Rare and Excellent History of
  Saladin*, Ashgate, 2001, still in copyright and *not* what Hillenbrand
  cites). A biography of Saladin by a member of his circle, and the source
  most directly relevant to 1187 if the register is ever extended to that
  event.

The Conder and Wilson translation of Baha' al-Din is the one candidate here
with a plausible public-domain path to a `production_role` above
`research_only`, on the same reasoning that makes Luard's Matthew Paris edition
the Road proof's fallback: an 1897 translation is old enough that the
translation itself, not only the underlying medieval Arabic, is out of
copyright in most jurisdictions - unconfirmed here, since no rights review has
been done, but worth checking first for that reason.

Hillenbrand's book, and Islamic-perspective Crusades historiography generally,
is a finding aid for narrowing which passages in these sources to read next -
that is what a modern secondary synthesis is for. It cannot itself become a
row in `source-audit.csv`: the schema's `source_kind` values
(`manuscript_witness`, `critical_edition`, `primary_narrative`, `instrument`,
`map_object`) are all primary-source kinds, and a 1999 monograph is none of
them.

## The schema question, resolved

None of the four sources above had a `covers` register it could validly
declare in `jerusalem-roles.csv`: `ROLE_KINDS` argued claims about what
Jerusalem *means* or *is* - `sacred_centre`, `pilgrimage_destination`,
`textual_construct`, `cartographic_construct`, `network_node`,
`cartographic_memory` - and a chronicle's contribution is a different kind of
claim, what happened, when, according to whom.

This has been resolved by adding a seventh register, `contemporary_narrative`
(KAN-438 cont'd), to `ROLE_KINDS` in `scripts/crusades/validate.py`, with its
own evidence class (`chronicle_narrative`) and its own place in
`UNPLACEABLE_ROLES` - a narrative account is a claim about what happened, not
about where, so it stays `not_spatial` like the other five non-`network_node`
registers. The alternative this note originally weighed - routing a Muslim
chronicle through the `fourth_crusade`-style narrative apparatus instead, or a
fourth proof of its own - was not taken: the Holy Land act already had the
place for this claim (Jerusalem, in 1099), just not the register.

## What has actually been added

`cru-jer-ibn-al-qalanisi` in `source-audit.csv` (`source_kind:
primary_narrative`, `covers: contemporary_narrative`, `rights_status:
rights_review_required`, `production_role: research_only`) and
`cru-jer-qalanisi-1099` in `jerusalem-roles.csv` (sequence 11, `date_from`/
`date_to` 1099). Both carry `source_locator: pending` and `verification_state:
unverified`: what is established is that Ibn al-Qalanisi's continuation of the
Damascus chronicle, via Gibb's 1932 translation, is a real, identifiable,
near-contemporary Muslim witness to the loss of Jerusalem in 1099, and where to
find it. No page of Gibb's translation has been opened for this corpus - the
locator is Hillenbrand's own citation of it (1999, p. 619), not a page of the
source itself, and the two are not the same claim.

This closes the schema half of `vd-cru-islamic-witness-gap`. It does not close
the debt: the register that argues "what a witness says happened" now exists
and is populated, but nobody has yet read what that witness actually says.

## What is still open

It does not add, edit, or resolve anything else in `source-audit.csv`,
`jerusalem-roles.csv`, or `places.csv`, and it does not touch
`vd-cru-jerusalem-locators` or `vd-cru-arabic-forms`, the two debts already
blocking `jerusalem:research` alongside this one.

Closing `vd-cru-islamic-witness-gap` the rest of the way means: read the
passages in Gibb's translation actually relevant to 1099 - not Hillenbrand's
citation of it - and move `cru-jer-qalanisi-1099` off a pending locator, on the
same discipline every other row in this corpus is held to, no more and no
less. Baha' al-Din via Conder and Wilson remains worth a rights check
separately, since it may support a `production_role` this row cannot.
