# Evidence and reconstruction contract

KAN-377 defines a common minimum for claims, rows and geometry. It does not
flatten the richer CND, VMN or HSE ledgers. The normative vocabulary is in the
`evidence` section of
[`data/contracts/terra-chartarum.json`](../../data/contracts/terra-chartarum.json).

## Evidence tiers

| Rank | Tier                   | Meaning                                                                 | Publication use                         |
| ---: | ---------------------- | ----------------------------------------------------------------------- | --------------------------------------- |
|    0 | `editorial_unverified` | Editorial assertion, lead or fixture                                    | Never a publishable fact                |
|    1 | `bibliographic`        | Identified work or dataset, no feature locator                          | Context and discovery only              |
|    2 | `feature_locator`      | Source plus page, folio, sheet, feature or equivalent locator           | Minimum for ordinary publishable claims |
|    3 | `inspectable_primary`  | Stable, directly inspectable primary witness with rights state          | Strong direct evidence                  |
|    4 | `corroborated_primary` | Independent primary corroboration, or primary plus critical scholarship | Claims requiring corroboration          |

Publishable prose claims, dated events, route segments, boundary phases and
map-object metadata require at least `feature_locator`. A dataset-level citation
does not satisfy this rule when individual features come from different sources.
Every such feature needs its own source join and locator.

The tier describes the evidence package, not whether the claim is persuasive.
Confidence is recorded separately as `direct`, `high`, `medium`, `low` or
`editorial_reconstruction`.

## Dates

The canonical precision terms are `exact_date`, `exact_year`, `year_range`,
`circa`, `century`, `terminus_post_quem`, `terminus_ante_quem`, `disputed` and
`undated`.

- Exact values carry the value they claim to know.
- A range carries both bounds and states whether they are inclusive.
- `disputed` records the competing readings and an editorial decision; it is
  not a synonym for low confidence.
- `undated` carries no invented midpoint.
- Open-ended historical duration uses a terminus term, not a fake distant year
  in prose. Storage sentinels such as `9999` remain implementation details.

Existing HSE `year` maps to `exact_year`; its `open` maps to `undated` only when
no evidential terminus exists. VMN day-level dates map to `exact_date`. CND's
frozen precision vocabulary is already a compatible subset.

## Geometry provenance

Every evidence-bearing geometry declares one of:

| Term                       | Claim made                                                   |
| -------------------------- | ------------------------------------------------------------ |
| `source_geometry`          | Geometry is supplied by the cited source                     |
| `georeferenced_trace`      | Geometry is traced from an identified, georeferenced witness |
| `scholarly_reconstruction` | Geometry is a documented reconstruction from evidence        |
| `editorial_generalisation` | Geometry is a display device and not a positional claim      |
| `modern_reference`         | Geometry is a modern base/reference location                 |

CND's `georeferenced_source` and `display_generalisation` are accepted aliases.
An editorial or scholarly reconstruction must be structurally tagged and visibly
disclosed wherever it appears; colour alone is insufficient. Source geometry
and reconstruction may never share a value that makes them indistinguishable.

## Compatibility with specialist ledgers

- CND `source_id` plus `locator_type`/`locator` supplies feature-level evidence;
  `review_state` remains stricter than this tier model.
- VMN `source_keys` keep page anchors after `:` and remain attached to each
  port, route, event and commodity row.
- HSE `evidence.csv` already separates claims, feature IDs, source keys and
  page/folio locators. Its promotion and rights rules remain authoritative.

Automated extraction, OCR, HTR or LLM normalization can assemble an evidence
package but cannot increase its tier or approve a claim.
