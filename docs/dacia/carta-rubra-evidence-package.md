# Carta Rubra 1918-1920 evidence package

KAN-354 assembles a source-complete **candidate** package for comparing how
ethnographic evidence was made legible around the post-war settlement. The
machine-readable sources and claims are
[`carta-rubra-sources.csv`](../../data/dacia/reference/carta-rubra-sources.csv)
and
[`carta-rubra-claims.csv`](../../data/dacia/reference/carta-rubra-claims.csv).
They are hash-frozen in
[`research-package-manifest.json`](../../data/dacia/reference/research-package-manifest.json).

## Typed evidence, not one map pile

| ID                            | Type                      | Production posture                                               | Review boundary                                  |
| ----------------------------- | ------------------------- | ---------------------------------------------------------------- | ------------------------------------------------ |
| `cr-map-kaba-1919`            | Map witness               | Primary; LOC/WDL free-use advisory and high-resolution downloads | Sheet transcription pending                      |
| `cr-map-war-office-1918`      | Map witness               | Fallback; LOC/WDL free-use advisory                              | Sheet and explanatory note review pending        |
| `cr-map-teleki-1920`          | Map witness               | Research only; no-copyright statement is U.S.-specific           | Global production rights not inferred            |
| `cr-map-demartonne-1920`      | Map witness/article       | Research only                                                    | Plate state, scale, and reuse review pending     |
| `cr-stat-kaba-report-1919`    | Statistical/report source | Research source with free-use advisory                           | Table-to-map derivation review pending           |
| `cr-stat-hungary-census-1910` | Statistical tables        | Research only; repository permission required                    | Exact table-to-map derivation review pending     |
| `cr-diplomatic-trianon-1920`  | Diplomatic context        | Research only                                                    | UN reuse and legal interpretation review pending |

The two production map roles are explicit and cannot pass validation unless
the record has both sufficient resolution and production-wide reuse terms.
The Kaba map is available from the Library of Congress at up to 9654 by 11528
pixels and as JPEG2000. The War Office portfolio supplies a separately cleared
fallback. An exact downloaded derivative and its checksum still need to be
frozen before the interaction is built.

## Claim discipline

Every high-importance claim names its actor, institution, source, and locator.
`argument_support` keeps three cases distinct:

- `supported`: a checked source explicitly supports the attributed territorial argument;
- `not_established`: the source supports the descriptive claim but not the
  actor's diplomatic intent; and
- `not_applicable`: the record is legal context rather than an advocacy claim.

The current claims deliberately use `not_established` where catalogue metadata
or the visible title supports a method/content statement but does not establish
delegation use or territorial intent. In particular, the Teleki record does not
by itself prove how the map was used at the Paris Peace Conference. Treaty of
Trianon Article 27(3) is kept as final legal context, not retrofitted as a map
claim.

## Open review debt

The package is technically complete and production sources are identified, but
all interpretive claims remain candidates. `vd-carta-rubra-claim-review`
requires a named researcher to review each claim against the cited map, legend,
article, table, or treaty before the research gate can pass.
