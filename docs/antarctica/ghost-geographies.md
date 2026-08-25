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

## The register that is not ours: Coronelli, 1691

Ten of the fifteen records come from one printed page. The last leaf of
`Terre Polari, Artiche, ed Antartiche` in _Atlante Veneto_ Tomo I (printed p. 76,
Rumsey 12186.107) is a rejection register: Coronelli names the lands he will not
carry and, for most of them, says why.

He works in three registers, and the rows preserve the difference rather than
flattening it:

- **Argued.** The Sevarambi get a full case. No author's name is attached to the
  history printed at Paris in 1677; the circumstances are paradoxical; the same
  history dates the discovery to 1427, so two and a half centuries would have
  passed in silence; and a great priest of the Sun could not have been ruling a
  Persia already under Islamic law. That is source criticism, and it is what
  makes these rows Act III material rather than Act VI.
- **Asserted.** The Isle of Pines opens with its verdict, `per favolosa pure
viene tenuta`, and Frisquemore is named among countries `capricciosamente
inventati da Ingegni otiosi`. The reason has to be read off the pairing.
- **Swept up.** The Terra di Vista and the Terra de' Papagalli get no verdict in
  the sentence that introduces them. The next paragraph opens `Queste Favole si
possono aggiungere` and takes them in retrospectively. Those two rows say so:
  `disproved` there rests on Coronelli's sentence order, which is weaker than
  either of the other registers, and the note carries the weakness rather than
  levelling it up to match its neighbours.

The last five names, the Strait of Anian, Frisland, Nova Albion, Saint Borondon
and Fonseca, are disposed of in one clause with a single shared reason: after
their supposed discoveries nobody was ever again able to find or see them. That
is this table's own pattern, stated in 1691. Those rows carry the verdict and
the reason and almost nothing of the original claim, because the page gives
neither discoverer nor date, and `what_was_reported` says only what the passage
says.

### Whose verdict it is

`later_status` is `disproved` on all ten and names
`ant-src-coronelli-atlante-veneto` as the source of the disproof. That is the
whole point of the field being sourced: the judgement is Coronelli's, dated,
attributable, and open to being wrong.

`current_scholarly_status` is `unresolved` on all ten. This corpus holds no
modern authority on any of these features, and inheriting a seventeenth-century
verdict as a present-day one is precisely the confusion the two fields exist to
prevent. A reader who wants to know what scholarship now says about Frisland
will not find this dataset pretending to answer.

### What was left out, and why

Coronelli's list runs past the polar essay's subject. In the same passage he adds
the City of Tartar in Tartary, Lusson in the Manila islands, Lodrino in Albania,
Manoa del Dorado and the Lake of Parime in Guiana, and Norumberga and Hochelaga
in New France. Those seven are not recorded here.

He introduces them himself as a separate class, a comparison set the polar fables
`si possono aggiungere` to, and they are continental interior fictions with no
bearing on any ocean this programme charts. Recording them would turn an
Antarctic table into a general phantom-lands index, which is a different dataset
and should be argued for as one.

The line is drawn at the polar essay's own list, not at the southern hemisphere.
Five of the ten records held here are northern or Atlantic: Frisquemore sits on
the confines of Lapland and the Samoyeds, Anian and Nova Albion are north-west
American, Saint Borondon Atlantic, Fonseca Caribbean. They are kept because the
record is an act of judgement made in one breath, and because the essay is headed
for both poles. Every one of those rows states in its note that it is not a
southern feature and must not be read as an Antarctic phantom.

### How much of the essay has been read

Three of the seven printed pages: 70, 73 and 76. Rumsey 12186.102, .103 and .106
are unread and open as `ant-gap-atlante-polar-leaves`. Every Coronelli row is
held at `low` confidence for that reason alone, independently of how firm the
reading of page 76 is.

## Reusing this elsewhere

`src/lib/uncertainty.ts` is programme-neutral by construction. It knows nothing
about Antarctica: it takes a record with a claimant, a report, a plausibility and
a later evidence statement, and returns presentability, a non-colour encoding, a
status line and a static transcript.

Phantom islands, speculative lakes, false mountain ranges and retracted
coastlines all have the same shape, and the module is written to be promoted into
the shared TC-CORE contracts rather than left in Antarctica-specific code.
