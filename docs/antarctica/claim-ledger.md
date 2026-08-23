# Antarctic claim ledger and discovery terminology (KAN-421)

The scholarly control layer for every high-risk proposition in TERRA INCOGNITA,
built before drafting rather than after it.

Tables: `data/antarctica/claims.csv`, `terminology.csv`.

## The ledger

Twenty claims, eleven of them flagged high risk, none reviewed.

Each claim carries its act and anchor, the proposition itself, a claim type, the
sources on each side, a locator, a confidence, the map objects and GIS records it
depends on, and a disagreement note. The note is required on every row, which is
the ledger's most useful rule: a claim nobody can write a disagreement note for
is usually a claim nobody has thought about.

Claim types are `fact`, `interpretation`, `historiographical_dispute` and
`reconstruction`. The distinction is enforced where it can be: a claim at high or
medium confidence must cite something, and a high-risk claim typed as `fact` must
cite something whatever its confidence.

## The claims that are blocked

Four propositions have no support at all and are recorded precisely so they
cannot be made in passing:

- **What Coronelli's polar material depicts.** The plate has not been seen.
- **Whether Coronelli distinguished inherited from reported information.** The
  Epitome text is untranscribed and the Milanesi monograph unconsulted, so any
  statement about his method would exceed the evidence entirely.
- **Whether particular ghost features were caused by mirage, refraction or ice.**
  Recording that a feature was later removed is safe. Saying why it was seen is a
  much stronger claim and no source is held for any instance of it.
- **The distance between the 1915 reported position and the 2022 wreck.** Both
  figures are unheld.

Two more are recorded as arguments the essay should resist. The claim that early
modern cartographers _believed_ in a balancing continent is an attribution of
motive, not a description of an argument, and the ledger separates them. The
claim that unrecorded sealing voyages may have sighted land earlier is an
argument from silence, and this project's own Dacia work is about how dangerous
those are.

## The one claim with real evidence

The 1910 chart compiles eleven voyages between 1772 and 1909. That is transcribed
from the Greenwich catalogue title, which is the strongest evidence the programme
currently holds, and it is the only claim at `source_checked`.

## Terminology

Seventeen definitions, because the words around 1820 do most of the damage when
they are used loosely.

The discovery vocabulary is enforced: the validator refuses the dataset if
`first sighting`, `first mainland sighting`, `ice front observation` or `first
landing` is missing, since Act V cannot say which question it is answering
without them. A sighting is a report and survives whether the thing seen existed
or not. A first mainland sighting is about continental rock rather than an ice
front. A first landing is a third question again.

The dataset has no field called **discovery**. The word bundles seeing,
recognising, reporting and being believed, and it carries a national priority
argument inside it. It appears in the programme only when quoting a source or
naming a historiographical position.

Two more pairs are held apart deliberately. **Dead reckoning** is a historical
inference made by a navigator and is evidence; **editorial interpolation** is a
drawing decision made by us and is not. The **reported sinking position** is a
calculated result published in a named account; the **wreck position** is where
the ship was found. Conflating those two is the exact error the audit observed in
secondary reporting.
