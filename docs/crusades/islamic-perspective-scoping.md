# Scoping note: a Muslim-authored witness for the Holy Land register (KAN-438)

This note exists to correct something before it becomes a data row. A prior
conversation in this repository's history described building an extraction
matrix from Carole Hillenbrand's *The Crusades: Islamic Perspectives*
(Edinburgh University Press, 1999/2000), including chapter-and-section detail
and a claim that the book's PDF was available to work from directly. Neither
is true of this repository or this session: no such file exists here, and
nothing below was read from it. Treat any page-level citation to that book
from that earlier text as unverified until someone actually opens a copy.

What follows is the honest version of the same gap.

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

These are not proposed as verified rows - none has a locator, none has been
read for this corpus, and adding one to `source-audit.csv` today would mean
inventing a `covers` register no schema value quite fits (`ROLE_KINDS` argues
claims about Jerusalem's meaning or position; a chronicle's value here is
closer to a seventh register - contemporary narrative - that does not exist
yet and would need its own validator rule, not a bent one). They are named so
the next pass over this gate does not start from nothing:

- **Ibn al-Qalanisi**, *Dhayl Ta'rikh Dimashq* (continuation of the Damascus
  chronicle) - the nearest thing to a contemporary Damascene witness to the
  First Crusade's arrival and the following decades.
- **Ibn al-Athir**, *al-Kamil fi'l-Ta'rikh* - a later (early 13th-century)
  universal chronicle, widely used for the Zengid and Ayyubid period; being
  later, it is a witness to how the period was remembered as much as to the
  period itself, and any row drawn from it should say which.
- **Usama ibn Munqidh**, *Kitab al-I'tibar* - a Syrian nobleman's memoir with
  direct, often-quoted observations of Franks in the Levant; the source most
  likely to speak to lived contact rather than to jihad or Jerusalem as ideas.
- **Baha' al-Din ibn Shaddad**, *al-Nawadir al-Sultaniyya* - a biography of
  Saladin by a member of his circle, and the source most directly relevant to
  1187 if the register is ever extended to that event.

Standard English translations exist for all four (Gibb for Ibn al-Qalanisi;
Richards for Ibn al-Athir; Hitti/Cobb for Usama ibn Munqidh; Richards again
for Baha' al-Din), which matters for the same reason the Rolls Series matters
to the Matthew Paris register: an out-of-copyright or clearly-licensed edition
is what lets a source carry a `production_role` above `research_only`.
Copyright status of each specific translation has not been checked and is not
asserted here.

Hillenbrand's book, and Islamic-perspective Crusades historiography generally,
is a plausible finding aid for narrowing which passages in these sources to
read first - that is what a modern secondary synthesis is for. It cannot
itself become a row in `source-audit.csv`: the schema's `source_kind` values
(`manuscript_witness`, `critical_edition`, `primary_narrative`, `instrument`,
`map_object`) are all primary-source kinds, and a 1999 monograph is none of
them.

## What this note does and does not do

It does not add, edit, or resolve anything in `source-audit.csv`,
`jerusalem-roles.csv`, or `places.csv`. It records a debt
(`vd-cru-islamic-witness-gap` in `data/crusades/reference/verification-debt.csv`)
against the `jerusalem:research` gate, alongside the existing
`vd-cru-jerusalem-locators` and `vd-cru-arabic-forms` debts that gate is
already blocked on.

Closing it means: pick one of the four sources above (or another with a
comparable case), read the passages actually relevant to Jerusalem's
Ayyubid-era meaning or the network argument, and add a `source-audit.csv` row
with a real locator - the same discipline every other row in that table is
held to, no more and no less.
