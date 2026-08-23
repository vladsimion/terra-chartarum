# Ghost geographies (KAN-426)

Features that were claimed, mapped, disputed, corrected or removed, held as
evidence of what was reported and believed rather than as a list of mistakes.

Table: `data/antarctica/ghost-geographies.csv`. Presentation contract:
`src/lib/uncertainty.ts`.

## The four questions

A ghost record is only publishable if it can answer four things: who introduced
the feature, what was actually reported, why that was reasonable at the time, and
what later evidence said. The validator requires all four, and
`assessPresentability()` refuses to render a record missing any of them.

Without the third question in particular, the presentation collapses into "these
people were wrong", which is retrospective omniscience and is worth nothing. Ross
reported a mountain range that later parties did not find, and Ross was the most
careful observer in this dataset, working in polar air where distance and
elevation are famously hard to judge. That is a fact about seeing, not about him.

## Five states, and why they are not one

`confirmed`, `modified`, `disproved`, `unresolved`, `not_applicable`. Each has a
distinct dash pattern and a distinct label, so nothing depends on colour, and
`unresolved` is a real answer that has to survive contact with a UI that would
rather show a verdict.

Two records here are filed `unresolved` although the literature reports them as
removed from charts. That is because no authority for the removal is held, and
the validator refuses a disproof that cannot name what disproved it. Ramsay's
survey is popular rather than scholarly and the audit has already ruled it may
not carry an individual case.

`laterStatus` and `currentScholarlyStatus` are separate fields, and `statusLine()`
shows both when they differ. A feature removed from the charts in 1843 whose
status is argued over now is a more interesting record than either half alone.

## Causes are a separate claim

No record in this dataset attributes a cause, and a test asserts that none does.

Saying a feature was later removed is a record of non-confirmation. Saying it was
a mirage, a refracted image or an ice island misread as land is a much stronger
claim requiring its own source, and the two are routinely conflated in popular
accounts. `claimsACause()` exists so a caller can tell them apart, and
`attributedCause` stays empty until a study supports it.

## The one that reaches into Act VIII

Morrell reported an extensive coast in the Weddell Sea in 1823, in the same
exceptional ice year that let Weddell reach an extraordinary latitude. Endurance
later drifted through water he had charted as land.

It is the neatest connection in the programme and therefore the one most in need
of discipline. Morrell's general reliability is separately disputed, which is a
question about the man rather than about this feature, and the two are kept
apart. Whether the drift track actually crosses the reported coast has not been
checked against either position, and the claim stays at low confidence until it is.

## Reusing this elsewhere

`src/lib/uncertainty.ts` is programme-neutral by construction. It knows nothing
about Antarctica: it takes a record with a claimant, a report, a plausibility and
a later evidence statement, and returns presentability, a non-colour encoding, a
status line and a static transcript.

Phantom islands, speculative lakes, false mountain ranges and retracted
coastlines all have the same shape, and the module is written to be promoted into
the shared TC-CORE contracts rather than left in Antarctica-specific code.
