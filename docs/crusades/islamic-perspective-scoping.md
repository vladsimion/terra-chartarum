# Scoping note: a Muslim-authored witness for the Holy Land register (KAN-438)

This note exists to correct something before it becomes a data row. A prior
conversation in this repository's history described building an extraction
matrix from Carole Hillenbrand's _The Crusades: Islamic Perspectives_
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

The Hillenbrand PDF lives outside this repository (this session's local
filesystem only) and is not committed here, will not be committed here, and is
not otherwise reproduced beyond the short citations quoted below under
fair-use-scale quotation for research purposes. It is a 1999/2000 Edinburgh
University Press monograph and is presumed in copyright; nothing about that
changes because a copy became available to read. The discipline this corpus
already applies to Choniates in `source-audit.csv` (`in_copyright`,
`production_role: research_only`, cited but not reproduced at length) is the
model for how Hillenbrand herself would be handled if she ever needed a row of
her own - which, per the reasoning below, she does not: she cannot be a
`source-audit.csv` row at all, only a finding aid for one.

The same applies, more directly, to Gibb's 1932 translation of Ibn
al-Qalanisi: the user supplied an 11-page excerpt (pp. 41-51 of the printed
book, a photographic scan with no text layer - read here as page images, not
extracted text) covering AH 490-494 (1096-1101). That excerpt also lives
outside this repository, is not committed here, and pp. 47-48 are described
and quoted only at citation scale below. Gibb died in 1971, so his translation
is presumed in copyright until roughly 2041 regardless of the 1932 publication
date; `rights_status: rights_review_required` and `production_role:
research_only` on `cru-jer-ibn-al-qalanisi` reflect that this has not changed,
only `verification_state` and `source_locator` have.

Conder and Wilson's 1897 translation of Baha' al-Din is a cleaner case: it is
public domain (see "Baha' al-Din: rights checked" below), and the 23-page
excerpt supplied (pp. 110-121, exported as a PDF from the volume's Google
Books scan) is treated the same way regardless - kept outside this repository,
described and quoted only at citation scale in "Baha' al-Din: read, and a
fabrication caught" below. Being public domain changes what could eventually
be reproduced from it, not what this note actually reproduces.

## The gap, precisely

The Holy Land register in `data/crusades/jerusalem-roles.csv` argues six
things Jerusalem was: a sacred centre, a pilgrimage destination, a described
land, a cartographic construction, a network node, and a later memory. The
sources behind the `textual_construct` and `network_node` records - Burchard
of Mount Sion's _Descriptio Terrae Sanctae_ and Marino Sanudo Torsello's
_Liber secretorum fidelium crucis_ - are both Latin Christian. `cru-jer-psalter`
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
confirmed against the printed running folios). Originally, this was a locator
into **Hillenbrand's citation of the source**, not into the source's own text

- the distinction the rest of this corpus already holds Burchard and Sanudo to
- and `verification_state: unverified` for all four followed from that. Two of
  the four have since moved past bibliography-only, in different ways: Ibn
  al-Qalanisi has been read (below), Baha' al-Din has had its rights checked but
  not its content (further below). Ibn al-Athir and Usama ibn Munqidh remain
  exactly where this section originally left them.

- **Ibn al-Qalanisi**, _Dhayl Ta'rikh Dimishq_. Arabic text: no edition of the
  Arabic itself is separately listed (Hillenbrand cites the translation
  directly). English translation: H. A. R. Gibb, _The Damascus Chronicle of
  the Crusades_, London, 1932 (Hillenbrand 1999, p. 619 / PDF p. 675). The
  nearest thing to a contemporary Damascene witness to the First Crusade's
  arrival and the following decades. **Since read directly** - see "What has
  actually been read" below; the rest of this list is still bibliography only.
- **Ibn al-Athir**, _al-Kamil fi'l-Ta'rikh_. Arabic critical edition: ed. C. J.
  Tornberg, 12 vols, Leiden and Uppsala, 1851-76 (Hillenbrand 1999, p. 617 /
  PDF p. 673). **No English translation appears in Hillenbrand's own
  bibliography** - the modern standard one (D. S. Richards, _The Chronicle of
  Ibn al-Athir for the Crusading Period_, 3 vols, Ashgate, 2006-2008) postdates
  this book and was not and could not have been a source for it. A row drawn
  from Ibn al-Athir today would need to say which edition it actually reads:
  the 19th-century Arabic edition, or the 21st-century Richards translation -
  they are not interchangeable, and Ibn al-Athir writing in the early 13th
  century about the 1090s is itself a witness to later memory as much as to
  the events.
- **Usama ibn Munqidh**, _Kitab al-I'tibar_. Arabic critical editions: ed. P.
  K. Hitti, Princeton, 1930; ed. Q. al-Samarra'i, Riyadh, 1987. English
  translation: P. K. Hitti, _Memoirs of an Arab-Syrian Gentleman_, Beirut,
  1964 (also French translations by Miquel 1983 and Derenbourg 1889;
  Hillenbrand 1999, p. 619 / PDF p. 675). A memoir with direct, often-quoted
  observations of Franks in the Levant - the source most likely to speak to
  lived contact rather than to jihad or Jerusalem as ideas, so the weakest fit
  for the Holy Land register specifically and the strongest fit for a future
  Chapter 6-shaped ("Life in the Levant") gap instead.
- **Baha' al-Din ibn Shaddad**, _al-Nawadir al-Sultaniyya_. English
  translation: C. R. Conder and C. W. Wilson, _The Life of Saladin_, London,
  1897 (Hillenbrand 1999, p. 620 / PDF p. 676) - a Palestine Exploration Fund
  translation, unlike the modern standard English translation (D. S. Richards,
  _The Rare and Excellent History of Saladin_, Ashgate, 2001, still in
  copyright and _not_ what Hillenbrand cites). A biography of Saladin by a
  member of his circle. **Since read directly, for 1187** - see "Baha'
  al-Din: read, and a fabrication caught" below.

The Conder and Wilson translation of Baha' al-Din turned out to be the one
candidate here with a clean public-domain path, on the same reasoning that
makes Luard's Matthew Paris edition the Road proof's fallback - it was
"worth checking" when this list was first written; it has since been checked
and read.

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
Jerusalem _means_ or _is_ - `sacred_centre`, `pilgrimage_destination`,
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

## What has actually been read

pp. 47-48 of Gibb's translation, directly, from the supplied page images. They
cover: the Franks' march on Jerusalem via al-Ramla; the siege and the tower
brought up against the wall; the storming of the city on 22 Sha'ban AH 492
(14 July 1099) after the townsfolk's proposal to negotiate a surrender broke
down; the massacre that followed; the Jewish community's death in the
synagogue, which the Franks burned over their heads; the surrender of the
Sanctuary of David on guarantee of safety two days later; and, immediately
after, al-Afdal's Fatimid relief force arriving too late, encamping at
Ascalon, and being routed by the Franks in the field. Ibn al-Qalanisi narrates
all of this as a loss - the fall of a city, the massacre of its people, the
razing of a place of worship - not as an arrival, which is exactly the
asymmetry the register exists to hold open against the six Latin-authored
ones.

`cru-jer-ibn-al-qalanisi` in `source-audit.csv` now carries `locator: pp.
47-48`, `verification_state: verified`, `review_status: source_checked`.
`cru-jer-qalanisi-1099` in `jerusalem-roles.csv` carries `source_locator: pp.
47-48`, `review_state: normalized`, `confidence: high`. Both are the first
non-`pending` locator anywhere in this corpus - across all three proofs,
fifteen sources and forty-two other data rows. `production_role` on the source
stays `research_only`: reading the passage for research and citing it at this
scale is not a rights review, and Gibb's translation is presumed in copyright
regardless (see "Provenance and rights" above).

`vd-cru-islamic-witness-gap` is marked resolved in
`data/crusades/reference/verification-debt.csv` on this basis.

## Baha' al-Din: rights checked

A narrower question than the reading below: is Conder and Wilson's 1897
translation actually likely to clear rights, or was "plausibly public domain"
just a guess? Checked, not guessed, on two independent grounds:

- **US copyright**: as of 2026, any work published in 1930 or earlier is
  unconditionally in the public domain in the United States, regardless of the
  author's or translator's date of death. This is a bright-line rule under
  current US law and settles an 1897 publication on its own, with no further
  argument needed.
- **UK/EU copyright** (life of the author plus 70 years): Charles William
  Wilson (1836-1905) and Claude Reignier Conder (1848-1910) were both already
  established Royal Engineers officers and Palestine Exploration Fund figures
  by 1897, not young men early in long careers, which makes it a near-certainty
  both died well before 1956 - the date that would be needed for this
  translation to still be in UK/EU copyright today. Their specific death years
  are recorded here from general historical knowledge; this session could not
  independently re-verify them against a citable source, since its network
  access is restricted to GitHub and nothing else, archive.org included (the
  same restriction recorded when this note first tried to reach it).

This is a materially different position from Gibb 1932, where the life+70
argument is the _only_ one available and does not yet clear the work (Gibb
died in 1971; expiry is roughly 2041) - the two translations cannot be treated
alike, and this note does not treat them alike. `rights_status:
public_domain_text` on `cru-jer-baha-al-din` rests on this.

## Baha' al-Din: read, and a fabrication caught

Before real pages of this translation were available, this conversation was
offered a plain-text block claiming to be "the transcribed text for pp.
110-121" of the 1897 edition. It was rejected without being used, on internal
grounds alone: the prose register was wrong for a Victorian PEF translation
(too smooth, too little of the period's dense footnoting), the content read
as a compilation of the anecdotes that circulate in popular secondary
accounts of Hattin and 1187 rather than a page-by-page translation, and there
was no way to verify it against an actual copy. That reasoning turned out to
be correct.

Once the real pages arrived - a PDF exported from the Google Books scan at
the volume's own permalink, pp. 110-121, with an embedded OCR text layer this
project's extractor could not decode cleanly, so read as page images instead

- pp. 118-120 (Part II, Chapter XXXVI, "Taking of the Holy City") were read
  directly and checked against the rejected text. Three concrete discrepancies
  confirmed it was fabricated rather than merely paraphrased:

- The rejected text dated the surrender to "the 2nd of Rajab." The real text
  gives 27 Rajab (2 October 1187) - the date that is calendrically consistent
  with the same text's own 15 Rajab arrival date twelve days earlier. "2nd of
  Rajab" would place the surrender _before_ the siege began.
- The rejected text gave the ransom as 10/5/2 Tyrian dinars for man/woman/
  child. The real text gives 10/5/**1**.
- The rejected text included a dramatic speech by Balian threatening to kill
  5,000 Muslim prisoners and destroy the Dome of the Rock if terms were
  refused. No such speech, or anything resembling a quoted negotiation, appears
  in this chapter: Baha' al-Din's account of the surrender itself is two
  sentences ("messengers had several times passed backwards and forwards...
  a treaty was concluded").

What the real chapter does contain: Saladin's arrival before Jerusalem on 15
Rajab AH 583 (20 September 1187), the shift of his camp to the north wall, the
mining that breached it near the Wadi Jehennum corner, the negotiated
surrender on 27 Rajab (2 October 1187) - the anniversary of the Prophet's
night journey, which the text reads as divine confirmation - the ransom
terms, the removal of the cross from the Dome of the Rock, the restoration of
Friday prayers, and Baha' al-Din's own framing of the whole event as a
triumph for Islam. That is the deliberate counterpart to Ibn al-Qalanisi's
1099: the same register now holds a loss and a recovery, in the words of two
different Muslim authors, rather than one flattened into the other.

`cru-jer-baha-al-din` in `source-audit.csv` now carries `locator: pp.
118-120`, `verification_state: verified`, `review_status: source_checked`.
`cru-jer-shaddad-1187` in `jerusalem-roles.csv` (sequence 12) carries the same
locator, `review_state: normalized`, `confidence: high`. `production_role`
stays `research_only`: a passage read for research is not the same as a
reproduction resolved for publication, and nothing about the rights position
above has changed.

## What is still open

This does not touch `vd-cru-jerusalem-locators` (Burchard and Sanudo, still
`pending`) or `vd-cru-arabic-forms` (the place-name romanisations), the two
debts still blocking `jerusalem:research` alongside the one this note closes.
It also does not touch `production_role`, `rights_status`, or
`resolution_status` on either Muslim-authored row: a source can be read and
verified for research without being cleared for reproduction, and both rows
are the former, not the latter.

Ibn al-Athir and Usama ibn Munqidh remain exactly where the "Candidate primary
sources" section above left them: identified from Hillenbrand's bibliography,
not rights-checked, not read.
