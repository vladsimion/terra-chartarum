# Venetian Maritime Network (VMN) — data track

Scaffolding for the "Venetian Maritime Network, c.1400 — Dataset & Essay
Enrichment" sub-project (KAN-145). The authoritative spec lives in Confluence:
_Venetian Maritime Network, c.1400 — Dataset & Essay Enrichment_.

## Layout

| Path           | Holds                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `data/vmn/`    | Source CSVs (`sources.csv`, later `ports.csv`, `routes.csv`, …), traced GeoJSON, and the compiled `venetian-*.fgb` outputs. |
| `scripts/vmn/` | The `build.py` pipeline and (later) `validate.py` QA gate.                                                                  |
| `docs/vmn/`    | This README, plus `decisions.md` (VMN-2) and `data-dictionary.md` (VMN-3) as they are produced.                             |

## Pipeline

`make vmn` runs `scripts/vmn/build.py`. Today that is a no-op stub; the real
compile path (CSV → geocode/join → expand events → clip to Natural Earth land →
validate §8 → write FlatGeobuf) arrives with the D4 build tickets
(VMN-9 / VMN-13 / VMN-19) and the CI validation gate with VMN-21.

## Provenance

Every compiled feature carries a `source` key resolving into
[`data/vmn/sources.csv`](../../data/vmn/sources.csv). See the spec §8 for the
full QA/validation rules the gate will enforce.
