# Antarctic claim ledger and discovery terminology (KAN-421)

The scholarly control layer for every high-risk proposition in TERRA INCOGNITA,
built before drafting rather than after it.

Tables: `data/antarctica/claims.csv`, `terminology.csv`.

## The ledger

Twenty-three claims, thirteen of them flagged high risk, none reviewed. Six are
`source_checked`; that state records that the cited locator was opened, not that
a scholarly reviewer accepted the proposition.

Each claim carries its act and anchor, the proposition itself, a claim type, the
sources on each side, a locator, a confidence, the map objects and GIS records it
depends on, and a disagreement note. The note is required on every row, which is
the ledger's most useful rule: a claim nobody can write a disagreement note for
is usually a claim nobody has thought about.

Claim types are `fact`, `interpretation`, `historiographical_dispute` and
`reconstruction`. The distinction is enforced where it can be: a claim at high or
medium confidence must cite something, and a high-risk claim typed as `fact` must
cite something whatever its confidence.

## The claims that remain blocked

Two propositions have no support at all and are recorded precisely so they
cannot be made in passing:

- **Whether particular ghost features were caused by mirage, refraction or ice.**
  Recording that a feature was later removed is safe. Saying why it was seen is a
  much stronger claim and no source is held for any instance of it.
- **The distance between the 1915 reported position and the 2022 wreck.** Both
  figures are unheld.

The two Coronelli propositions are no longer unsupported. The plate, selected
_Atlante Veneto_ pages and the _Epitome_ chapter have been read together, moving
both claims to `source_checked` at medium confidence. They remain unreviewed:
three polar leaves, the globe, the rest of the atlas and Milanesi's workshop
study are still open, and the explanation for the missing southern plate is the
essay's inference rather than Coronelli's statement.

Two more are recorded as arguments the essay should resist. The claim that early
modern cartographers _believed_ in a balancing continent is an attribution of
motive, not a description of an argument, and the ledger separates them. The
claim that unrecorded sealing voyages may have sighted land earlier is an
argument from silence, and this project's own Dacia work is about how dangerous
those are.

## The source-checked claims

Four claims now carry opened locators. Two describe Coronelli's graphic/textual
treatment of the poles. The other two describe the 1910 chart's eleven-voyage
compilation and the additions and subtraction that distinguish it from the 1874
issue. None is `reviewed`, and nothing in the public tier depends on them yet.

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

## Running the review (KAN-432)

The essay is held on this ledger. Its frontmatter states the gate directly: no
claim has completed scholarly review, so publishing would present an inherited
account as an observed one, which is the error the essay is about.

Until now there was nothing to run against that gate. The five reviewable tables
here - claims, sources, map objects, terminology and priority claims, 108 records
in all - could only be promoted by hand-editing a CSV, which is the one form of
review nobody can check afterwards. `scripts/antarctica/review.py` is the same
tool `scripts/dacia/review.py` is, pointed at this programme:

```bash
python3 scripts/antarctica/review.py queue                    # what is waiting
python3 scripts/antarctica/review.py queue -v --table claims  # with blockers
python3 scripts/antarctica/review.py show ant-clm-cook-blank
python3 scripts/antarctica/review.py promote ant-clm-cook-blank \
    --reviewer "V. Simion" --set locator="Cook 1777, II. 231"
python3 scripts/antarctica/review.py gaps                     # by what each blocks
```

Every promotion is written to a scratch copy of `data/antarctica`, validated with
the ordinary gate, and kept only if the gate passes. A reviewer who has not
supplied a locator, or who calls a source reviewed before it is verified, gets
the refusal and no file changes. `queue` derives each record's blockers by
trial-promoting it against the real validator, so the tool never carries a second
copy of the rules.

### Attribution

All five reviewable tables carry `reviewer` and `review_date`, and the validator
enforces both directions:

- a row at `reviewed` must name its reviewer and carry an ISO `review_date`;
- a row **below** `reviewed` may carry neither. A name on an unreviewed row is
  either a half-finished promotion or somebody's note to themselves, and both
  read as an adjudication that never happened.

`promote` writes all three fields together, so the only way to reach `reviewed`
is through a command that records who did it. No existing row was back-filled
when the columns were added: every one of the 108 is below `reviewed`, and
inventing a reviewer for them would be exactly the fabricated adjudication this
workflow exists to prevent.

One limit worth stating rather than discovering:

- **The ladders differ from Dacia's.** These tables were built with a
  source-audit vocabulary (`candidate` / `source_checked` / `reviewed` for the
  audit tables, `unreviewed` / `source_checked` / `reviewed` for the ledgers).
  Adding rungs to match the other programme would make every existing row's
  state a lie, so the tool walks the ladder each table already declares.
