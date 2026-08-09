# CCD Definition of Done

A trench is not done because its prose is finished. It is done when six
independent gates have each passed on their own evidence. The gates live in
[`gates.csv`](../../data/dacia/reference/gates.csv); the live status board is
[`trench-gates.csv`](../../data/dacia/reference/trench-gates.csv), and
`npm run dacia:validate` enforces the matrix.

## The six gates

| Gate            | The question it asks                                                             |
| --------------- | -------------------------------------------------------------------------------- |
| **Research**    | Is the argument carried by identified witnesses rather than by assertion?        |
| **Rights**      | May every reproduced image and dataset actually be published?                    |
| **Data**        | Does the trench read shared corpus data that validates and rebuilds?             |
| **Interaction** | Does every visual state resolve to a record with source, locator and confidence? |
| **Editorial**   | Has the prose been read against the evidence it claims, by a named editor?       |
| **Release**     | Do the site-wide publication checks pass with the trench in place?               |

Each gate is `pending`, `partial`, `passed` or `waived`. A `passed` gate must
cite evidence, and that path must exist on disk. A `waived` gate must record
why. The register is checked, so a gate cannot be marked passed against a file
that was deleted or renamed.

**Research, Rights, Data, Interaction and Editorial all block release.** The
validator refuses a trench that claims a passed release gate while any of them
is still open. This is the machine form of the rule that finished prose is not
a release: an essay can be beautiful, accurate and complete and still fail,
because its evidence is privately duplicated or its images are not cleared.

Every registered trench carries all six gates. A missing row is an error, not an
omission - the matrix is complete or the gate fails.

### Trench A, and why it does not pass yet

Terra Sigillata is in production and its rights gate genuinely passes: all
thirteen plates are authored SVG reconstructions, so no third-party reproduction
is involved. Its data and interaction gates do not pass. The evidence is inline
in the exhibition rather than corpus-backed, and its Sondaje cells carry
editorial notes that resolve to no record.

Its release gate is therefore `partial`, not `passed`: it was released before
this Definition of Done existed, and it re-passes when KAN-338 and KAN-339 close
the two open gates. Grandfathering it would have made the rule decorative on the
first trench it met.

## Campaign gates

[`campaigns.csv`](../../data/dacia/reference/campaigns.csv) records entry and
exit criteria for Campaigns I–IV, each mapped to concrete Jira keys rather than
to prose. The validator checks the key format and that every campaign used by
`programme-ids.csv` is declared.

| Campaign | Enters when                                           | Exits when                                       |
| -------- | ----------------------------------------------------- | ------------------------------------------------ |
| **I**    | IDs, vocabularies and this DoD are frozen             | CND 0.1 releases and one trench consumes it live |
| **II**   | CND 0.1 released and projected onto the Atlas         | Hiatus and Carta Rubra published on shared data  |
| **III**  | Treaty-frontier layer published, acquisition live     | CND v1.0 citable; object-led trenches released   |
| **IV**   | CND v1.0 published; absence and migration models live | Every trench indexed; cycle checks pass          |

## Required checks

The Dacia gate adds `npm run dacia:validate` to `npm run build`. It does not
restate the platform checks that already gate every release - editorial,
typography, epic evidence, indexing, geo interop, Lighthouse and the Playwright
suites are configured once in `package.json` and are not duplicated here.

`npm run dacia:test` covers the validation rules themselves: each test breaks
one rule against a private copy of the tables and asserts the validator refuses
it. Rules that only fire on data nobody has written yet are exactly the rules
that rot silently, so they are tested rather than trusted.

## Verification debt and open rights questions

Anything that resists verification is recorded in
[`verification-debt.csv`](../../data/dacia/reference/verification-debt.csv) -
never left as a hedge in the prose and never quietly dropped. Each row states
the question, where it was raised, which `trench:gate` pair it blocks, and the
path to resolving it. The validator checks that the blocked pair is real.

The register opens with four items inherited from Trench A, which already marks
these claims uncertain rather than asserting them: the orientation of the 1532
Honterus Chorographia; the repository of its single known impression, recorded
only as "likely Budapest"; whether Drobeta can be matched to an entry in
Ptolemy's catalogue; and the unsettled site of Vicina.

The rule is that debt is recorded where it can block something. A verification
question that blocks nothing is either resolved or it is not really a question.
