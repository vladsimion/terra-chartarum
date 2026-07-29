# VMN source log

This log is the human-readable companion to
[`data/vmn/sources.csv`](../../data/vmn/sources.csv). Feature-level provenance remains
machine-readable through each compiled FlatGeobuf feature's `source_keys` field.

## Historical authorities

| Key            | Source                                                                                                                      | Used for                                                            | Rights / constraint                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `LANE1973`     | Frederic C. Lane, _Venice: A Maritime Republic_ (Johns Hopkins University Press, 1973)                                      | Port phases, convoy routes, possession chronology                   | Copyright. Bibliographic facts and derived structured assertions only; page-level verification completed in KAN-154. |
| `OCONNELL2009` | Monique O'Connell, _Men of Empire: Power and Negotiation in Venice's Maritime State_ (Johns Hopkins University Press, 2009) | Political status, jurisdiction and territorial phases               | Copyright. Bibliographic facts and derived structured assertions only; page-level verification completed in KAN-154. |
| `SHEPHERD1911` | William R. Shepherd, _Historical Atlas_ (Henry Holt, 1911)                                                                  | Public-domain geographic cross-checks and reference-plate programme | Public domain. Allmaps-compatible annotation and territory registry completed in KAN-158.                            |
| `MCEVEDY`      | Colin McEvedy, _The Penguin Atlas of Medieval History_ (Penguin, 1961)                                                      | Broad chronology and western staging context                        | Copyright. Derived structured assertions only.                                                                       |

## Gazetteer and physical base data

| Key            | Source                                                                  | Pinned use                                                          | Rights        |
| -------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------- |
| `PLEIADES`     | [Pleiades](https://pleiades.stoa.org)                                   | Verified classical-place identifiers where disambiguation is useful | CC BY 3.0     |
| `NATURALEARTH` | [Natural Earth Vector](https://github.com/nvkelso/natural-earth-vector) | 1:10m land and coastline used for possession clipping and visual QA | Public domain |

Natural Earth is pinned to release `v5.1.1`, Git commit
`9380cca83db5f9aef52d5e762765100745f84b27`. The exact source URLs, per-theme
versions and SHA-256 checksums live in
[`data/vmn/base/manifest.json`](../../data/vmn/base/manifest.json). The land theme is
5.1.1; the matching coastline theme is unchanged since 4.1.0.

## Publication rules

- `source_keys` must be non-empty and resolve to `sources.csv`; the VMN QA gate enforces
  this for every compiled feature. Keys may carry a `:<locator>` suffix
  (`LANE1973:p436`), the KAN-154 page-level citation form; the gate resolves the base
  key and validates the locator syntax.
- **Edition and pagination basis (KAN-291).** All `pNN` locators are the **printed page
  numbers of the two anchor print editions** named in the table above: Lane's
  Johns Hopkins first edition of 1973 and O'Connell's Johns Hopkins edition of 2009.
  A locator is never a PDF/scan sequence number. `LANE1973:p436` therefore means
  page 436 as printed in Lane 1973, and `OCONNELL2009:p162-164` means O'Connell's
  Appendix A, "Dates of Venetian domination", at its printed pages.
- **Named locators for unfoliated front matter.** Lane's Chronology carries no printed
  folio, so it is cited as `LANE1973:chronology` rather than a guessed roman numeral.
  The accepted named locators are `chronology` and `appendix-a`; everything else must be
  a printed page. This rule replaced two `pxvi`/`pxvii` locators from the first KAN-154
  pass whose content was correct but whose page numbers were not visible on the page —
  a locator must be readable in the source, not inferred.
- KAN-154 completed the scholarly page-level pass against the anchor editions — Lane,
  _Venice: A Maritime Republic_ (JHU Press, 1973) and O'Connell, _Men of Empire_ (JHU
  Press, 2009). Every dated §5.5 route, possession and privilege boundary carries both
  anchors' cited values in
  [`chronology-discrepancies.csv`](../../data/vmn/chronology-discrepancies.csv);
  `not_in_source` marks a silent anchor, never an invented citation. Port phases are
  the long tail: 51 of 86 rows carry page locators the anchors actually support, and the
  remaining 35 keep bare source keys rather than a page claim nobody verified.
- KAN-155 freezes the seven ordered route sequences in
  [`route-sequences.json`](../../data/vmn/route-sequences.json). The VMN gate requires
  that contract to match every `routes.csv` field and to carry the explicit
  `page_level_verified_KAN_154` chronology status.
- KAN-177–180 freeze the eastern merchant-quarter decisions in
  [`quarter-representations.json`](../../data/vmn/quarter-representations.json).
  The only accepted representation is `port_only`; the gate forbids embedded
  geometry and checks that each decision resolves to a sourced port authority row.
- No copyrighted source scans are committed. The KAN-158 public-domain plate registry,
  Allmaps-compatible annotation and evidence boundary live under
  [`data/vmn/reference/`](../../data/vmn/reference/).
- Geometry is derived and generalized: port coordinates represent modern harbour
  locations; routes are schematic corridors; possession envelopes are clipped to the
  pinned Natural Earth land layer and are not cadastral boundaries.
