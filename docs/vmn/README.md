# Venetian Maritime Network (VMN) — data track

Scaffolding for the "Venetian Maritime Network, c.1400 — Dataset & Essay
Enrichment" sub-project (KAN-145). The authoritative spec lives in Confluence:
_Venetian Maritime Network, c.1400 — Dataset & Essay Enrichment_.

## Layout

| Path           | Holds                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| `data/vmn/`    | Source CSVs (`ports.csv`, `routes.csv`, `events.csv`, …), traced GeoJSON, and the compiled `venetian-*.fgb` outputs. |
| `scripts/vmn/` | The `build.py` pipeline and `validate.py` QA gate.                                                                   |
| `docs/vmn/`    | This README, plus `decisions.md` (VMN-2) and `data-dictionary.md` (VMN-3) as they are produced.                      |

## Pipeline

`make vmn` runs `scripts/vmn/build.py`, which validates the authority-table CSVs
and writes the cloud-native FlatGeobuf assets the atlas renders:

| Stage       | Ticket | Input        | Output                                | Status |
| ----------- | ------ | ------------ | ------------------------------------- | ------ |
| ports       | VMN-9  | `ports.csv`  | `public/geo/venetian-ports.fgb`       | live   |
| routes      | VMN-13 | `routes.csv` | `public/geo/venetian-routes.fgb`      | live   |
| possessions | VMN-19 | `events.csv` | `public/geo/venetian-possessions.fgb` | live   |

The ports stage projects each authority-table phase to a Point feature, mapping
ISO `start_date`/`end_date` to INTEGER `valid_from`/`valid_to` years (empty end →
`9999` open-ended sentinel) for the renderer's per-feature time filter, and
graduates the point on the controlled `status` vocabulary. The authority table
currently contains 86 phases for 70 ports, including local-language names and
regional groupings. It validates the CSV
(header shape, required fields, `status` vocab, lat/lon bounds, ISO dates,
`end ≥ start`, sourced phases, `source_keys` resolving into `sources.csv`, unique
`(port_id, start_date)`) and aborts on any error before writing. The compiled
`.fgb` carries GDAL's packed-Hilbert spatial index and is committed to the repo
as the served asset.

### Toolchain

The writer is GDAL's FlatGeobuf driver via
[`pyogrio`](https://pyogrio.readthedocs.io/) — whose wheel bundles GDAL, so no
system GDAL/PROJ is needed. Shapely builds route geometry and clips generalized
possession traces to Natural Earth land. Bootstrap the venv once, then build:

```sh
make vmn-venv   # one-time: creates .venv, installs pyogrio + numpy + shapely
make vmn        # compiles data/vmn/*.csv -> public/geo/venetian-*.fgb
```

## QA gate

`make vmn-validate` runs `scripts/vmn/validate.py`, the spec §8 QA gate over the
_compiled_ `public/geo/venetian-*.fgb` artifacts (complementing the CSV-level
checks in `build.py`). It runs in CI as the `vmn-data` job, so a malformed layer
can't merge green.

| §8 family   | Enforces                                                                      | Status |
| ----------- | ----------------------------------------------------------------------------- | ------ |
| Schema      | required fields present, enums valid, ids unique & slug-shaped                | live   |
| Geometry    | valid, correct type per file, EPSG:4326, bbox within the Med/Black Sea window | live   |
| Time        | `valid_from ≤ valid_to`; phases non-overlapping where a layer declares it     | live   |
| Provenance  | every feature's `source_keys` resolve in `sources.csv`                        | live   |
| Referential | routes' waypoints resolve to a port whose lifespan overlaps                   | live   |
| Coastline   | possessions ⊆ Natural Earth land (+1 km buffer)                               | live   |

Ports may carry temporally overlapping phases by design (decision D2: Venice is
`metropole` + `capital` at once), so the non-overlap rule is scoped to layers
that declare it (possessions), not ports.

The imported source's `bailiwick` label is normalized to `subject`: bailiwick
describes the administrative form of Venetian jurisdiction, while `status`
records sovereignty/tenure. The original distinction remains in the phase note.

```sh
make vmn-validate   # validates public/geo/venetian-*.fgb against spec §8
```

## Provenance

Every compiled feature carries `source_keys` resolving into
[`data/vmn/sources.csv`](../../data/vmn/sources.csv). See the spec §8 for the
full QA/validation rules the gate enforces.
