# Hiatus attestation and absence timeline

KAN-349 turns the KAN-348 witness-family audit into a filterable candidate
timeline. It does **not** claim that any source is silent. The data live in
[`hiatus-timeline.csv`](../../data/dacia/reference/hiatus-timeline.csv), and the
six allowed decisions live in
[`hiatus-absence-classes.csv`](../../data/dacia/reference/hiatus-absence-classes.csv).
Both files are hash-frozen in
[`research-package-manifest.json`](../../data/dacia/reference/research-package-manifest.json).

## Current timeline boundary

| State                |    Period | Source family       | Current class  | Why                                                                                                    |
| -------------------- | --------: | ------------------- | -------------- | ------------------------------------------------------------------------------------------------------ |
| `hs-chronicles`      | 1100-1500 | Chronicle           | `not_surveyed` | Editions and recensions are identified but not collated.                                               |
| `hs-papal-registers` | 1200-1500 | Papal register      | `not_surveyed` | No register/folio sample exists yet.                                                                   |
| `hs-charters`        | 1300-1526 | Charter             | `not_surveyed` | A calibration object exists; the corpus sample does not.                                               |
| `hs-notarial`        |      1360 | Notarial/commercial | `not_surveyed` | The edition is bounded, but its acts have not been checked.                                            |
| `hs-fiscal`          | 1546-1619 | Ottoman fiscal      | `not_asked`    | Fiscal scope can answer settlement questions, not the learned macro-regional question at family level. |
| `hs-late-maps`       |      1570 | Late cartography    | `not_surveyed` | Exact atlas images are located but not transcribed or reviewed.                                        |

Each row resolves through `witness_id` to
[`hiatus-witness-families.csv`](../../data/dacia/reference/hiatus-witness-families.csv),
which holds the repository, source URL, citation, coverage, survival limit, and
rights posture. `source_family`, `period_from`, and `period_to` remain ordinary
columns so the timeline can be filtered without parsing prose.

## Absence decisions

`not_surveyed`, `not_asked`, and `survival_unknown` are blocker states with no
evidential weight. `named_elsewhere` prevents a local omission from being read
as a source-wide absence. `extra_muros` records that the question falls outside
a reviewed scope. Only `not_named` can contribute to a later argument from
silence, and the validator permits it only when both `scope_reviewed: yes` and
`review_status: reviewed` are present.

There is intentionally no `source_silent` value in this timeline taxonomy.
That CND attestation class is a downstream conclusion and remains separately
gated by reviewed source scope. A normalized timeline row cannot manufacture
it.

## Open review debt

All six states are candidates. A named researcher still needs to select each
sample, inspect the witness or edition, verify its locator and scope, and then
promote states individually. That work is registered as
`vd-hiatus-witness-review`; until it is closed, KAN-349 has reached the
machine-buildable boundary but not the reviewed-content boundary.

## Reviewing it

`hs-` and `hw-` records are recognised owners in
[`review.py`](../../scripts/dacia/review.py), on the same
`candidate -> source_checked -> reviewed` ladder every other trench's source
ledger uses, not the five-rung `review_state` ladder the corpus tables climb:

```bash
python3 scripts/dacia/review.py queue --table hiatus_timeline --verbose
python3 scripts/dacia/review.py show hs-charters
python3 scripts/dacia/review.py promote hs-charters --reviewer "Your Name"
```

`queue` and `show` trial-promote against the real validator like every other
table, so they report the package freeze above as a blocker rather than a
false "ready to promote". `promote` will keep refusing every `hs-`/`hw-`
record until whoever reviews it also re-freezes `research-package-manifest.json`
(`hs-`) or `source-ledger-manifest.json` (`hw-`) to match the post-promotion
bytes, in the same commit - the same deliberate step the CND pilot freeze
already requires elsewhere, and not one this tool takes for you.
