# Dacia Rediviva: the reception corpus and its rubric

Trench F is about how antiquity has been used, which means its corpus is full of
material that is compelling and is not evidence. Keeping those apart is the
whole methodological problem, so the rules are
[data](../../data/dacia/reference/reception-review-rubric.csv) rather than
editorial intention, and the validator enforces four of the five.

## Four classes, and what each is evidence of

[`reception-corpus.csv`](../../data/dacia/reference/reception-corpus.csv) types
every item, and the validator requires all four registers to be present -
dropping one would turn a comparison into a claim about whichever remained.

| Class                      | Evidence of                           | Role it may hold        |
| -------------------------- | ------------------------------------- | ----------------------- |
| `ancient_evidence`         | The ancient world, and its own method | up to authoritative     |
| `scholarly_reconstruction` | The scholarship that made it          | up to contextual        |
| `historical_reception`     | The moment that produced it           | reference artefact only |
| `contemporary_derivative`  | Present-day circulation               | reference artefact only |

The line the whole trench rests on is the third column of the last two rows.
**Reception documents its own moment and never the antiquity it depicts.** The
interwar map tells you about the interwar state; reading it as testimony about
the second century is precisely the move the reception it documents was making,
and the validator refuses to let such an item become `authoritative_evidence`.

## The rubric

| Rule   | What it forbids                                                                                 |
| ------ | ----------------------------------------------------------------------------------------------- |
| `rr-1` | Using any map here to adjudicate a present-day ancestry, descent or identity claim              |
| `rr-2` | Reading a reception artefact as testimony about antiquity                                       |
| `rr-3` | Letting an item with no identified creator or provenance hold any role above reference artefact |
| `rr-4` | Showing an artefact before its rights are cleared                                               |
| `rr-5` | Building on a class from which nothing has been selected                                        |

`rr-1` is marked `enforced_by: editorial` because no schema can catch it: it is a
constraint on what the prose may argue, and it is recorded here so that it is a
commitment rather than an intention. The other four are machine-checked.

## What is selected, and what is deliberately not

Three items are `selected`: Ptolemy's Geographia III.8, the Ortelius Parergon
sheet, and the Tabula Imperii Romani volumes. The first two are already CND
sources and are joined by `corpus_source_id`; the third is cited and not
reproduced, being in copyright.

Three are `class_only`, and that is a finding rather than a gap. The interwar
national cartography, the late-communist protochronist mapping and the unsourced
maps circulating online are all real classes the essay needs, and **no individual
item is named in any of them**. Naming one from recollection is exactly the
failure this corpus exists to prevent, so each class carries `pending` where its
identity would go, stays a `reference_artefact`, and cannot enter the production
corpus until somebody identifies a specific artefact in a holding institution,
dates it, and assesses its rights.

The last class needs one more note. An unsourced map circulating today may be
detailed, confident and widely shared, and none of that is provenance. **The
apparent authority of such an item is the reason for the rule, not an exception
to it**: an unidentified creator and an unstated source are what make something
reception rather than evidence, however good it looks.

## What each item claims (KAN-368)

The corpus classifies items;
[`reception-claims.csv`](../../data/dacia/reference/reception-claims.csv)
records what each one asserts and how it stands to the material it invokes. An
item with no claim recorded fails validation: without one it is decoration, and
the essay could show it without being able to say what it argues.

Four relationship kinds, and the distinction between the first two is the point
of the table:

- `derives_from` is a claim about transmission and needs its evidence, exactly as
  a `continuity` edge does in Nomen Errans. Ortelius restoring the province from
  the ancient authors is one; the TIR reconciling testimony with excavation is
  another. Neither may point at a class from which nothing has been selected.
- `resembles` asserts that two things look alike **and that nothing follows from
  it**. This is the visual counterpart of the `homonym_only` edge: a shared
  appearance is not a relationship, and the corpus says so in a row rather than
  leaving a reader to join them by eye.
- `responds_to` is for material that reaches for an older tradition without
  descending from it - the interwar and protochronist classes place a modern
  frontier beside an ancient one and let the resemblance argue.
- `no_relationship` is for the ancient testimony at the head of the corpus, which
  derives from nothing else in it.

**A contemporary derivative may never claim `derives_from`.** It may look exactly
like a scholarly map and inherit nothing from it, so the only relationships it
can assert are ones claiming no descent. That rule is enforced, and it is the
row `rcl-online-resemblance` exists to demonstrate.

Uncertainty travels as text. A claim marked `disputed` must state its
uncertainty in words rather than leaving it to a hue, so the contested reading
reaches a reader who cannot use colour - checked by length, crudely but
effectively.

The descent claim is recorded and not adjudicated. `rcl-protochronist-descent`
exists so the essay can show the claim being made; rubric `rr-1` forbids using
any map here to settle it, and nothing in the corpus may be read as taking a
position on who anyone is today.
