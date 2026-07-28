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

`make vmn` runs `scripts/vmn/build.py`, which validates the authority-table CSVs
and writes the cloud-native FlatGeobuf assets the atlas renders:

| Stage       | Ticket | Input             | Output                          | Status |
| ----------- | ------ | ----------------- | ------------------------------- | ------ |
| ports       | VMN-9  | `ports.csv`       | `public/geo/venetian-ports.fgb` | live   |
| routes      | VMN-13 | `routes.csv`      | `public/geo/venetian-routes.fgb` | stub   |
| possessions | VMN-19 | `possessions.csv` | `public/geo/venetian-possessions.fgb` | stub |

The ports stage projects each authority-table phase to a Point feature, mapping
ISO `start_date`/`end_date` to INTEGER `valid_from`/`valid_to` years (empty end →
`9999` open-ended sentinel) for the renderer's per-feature time filter, and
graduates the point on the controlled `status` vocabulary. It validates the CSV
(header shape, required fields, `status` vocab, lat/lon bounds, ISO dates,
`end ≥ start`, sourced phases, `source_keys` resolving into `sources.csv`, unique
`(port_id, start_date)`) and aborts on any error before writing. The compiled
`.fgb` carries GDAL's packed-Hilbert spatial index and is committed to the repo
as the served asset.

### Toolchain

The writer is GDAL's FlatGeobuf driver via
[`pyogrio`](https://pyogrio.readthedocs.io/) — whose wheel bundles GDAL, so no
system GDAL/PROJ is needed (geopandas/pyproj are deliberately avoided; they don't
build on Python 3.14). Bootstrap the venv once, then build:

```sh
make vmn-venv   # one-time: creates .venv, installs pyogrio + numpy
make vmn        # compiles data/vmn/*.csv -> public/geo/venetian-*.fgb
```

The CI validation gate lands with VMN-21.

## Provenance

Every compiled feature carries a `source` key resolving into
[`data/vmn/sources.csv`](../../data/vmn/sources.csv). See the spec §8 for the
full QA/validation rules the gate will enforce.
