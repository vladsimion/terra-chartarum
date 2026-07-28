# VMN source log

This log is the human-readable companion to
[`data/vmn/sources.csv`](../../data/vmn/sources.csv). Feature-level provenance remains
machine-readable through each compiled FlatGeobuf feature's `source_keys` field.

## Historical authorities

| Key            | Source                                                                                                                      | Used for                                                            | Rights / constraint                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `LANE1973`     | Frederic C. Lane, _Venice: A Maritime Republic_ (Johns Hopkins University Press, 1973)                                      | Port phases, convoy routes, possession chronology                   | Copyright. Bibliographic facts and derived structured assertions only; page-level verification remains KAN-154. |
| `OCONNELL2009` | Monique O'Connell, _Men of Empire: Power and Negotiation in Venice's Maritime State_ (Johns Hopkins University Press, 2009) | Political status, jurisdiction and territorial phases               | Copyright. Bibliographic facts and derived structured assertions only; page-level verification remains KAN-154. |
| `SHEPHERD1911` | William R. Shepherd, _Historical Atlas_ (Henry Holt, 1911)                                                                  | Public-domain geographic cross-checks and reference-plate programme | Public domain. Georeferenced plate annotations remain KAN-158.                                                  |
| `MCEVEDY`      | Colin McEvedy, _The Penguin Atlas of Medieval History_ (Penguin, 1961)                                                      | Broad chronology and western staging context                        | Copyright. Derived structured assertions only.                                                                  |

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
  this for every compiled feature.
- A source key records provenance, not a claim of page-level verification. KAN-154
  remains the explicit scholarly pass for Lane/O'Connell page citations.
- No copyrighted source scans are committed. Public-domain plate annotations, once
  produced, belong under `data/vmn/reference/` (KAN-158).
- Geometry is derived and generalized: port coordinates represent modern harbour
  locations; routes are schematic corridors; possession envelopes are clipped to the
  pinned Natural Earth land layer and are not cadastral boundaries.
