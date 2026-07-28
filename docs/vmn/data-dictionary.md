# VMN data dictionary (re-frozen — VMN-3, authority-table model)

The frozen field contract for the Venetian Maritime Network dataset. **Re-frozen at
the authority-table model** (KAN-149 review): the source-of-truth CSVs are temporal
**authority tables** keyed on a stable slug that repeats across phases, so other
datasets (charters, voyages, offices, naval stations) can reference a port or
waypoint by id. The deterministic FGB render artifacts are _derived_ from these
tables by the pipeline (VMN-9). Any deviation is recorded as a **Decision** below.
IDs and field names here are stable: never reused, never renamed after first publish.

## Common conventions (§5.1)

- **CRS:** EPSG:4326 (WGS84). CSV authority tables carry explicit `lat,lon` columns;
  derived geometry is lon/lat order. Geometry validated (`is_valid`, no
  self-intersections); polygons OGC-wound.
- **One geometry type per file** (FGB constraint): Point / MultiPolygon /
  LineString respectively.
- **Time (authority tables):** ISO calendar dates `start_date` / `end_date`
  (`YYYY-MM-DD`). `start_date` is required; an **empty `end_date` means open-ended**.
  Day precision is used where known; year-only facts use `YYYY-01-01`.
- **Time (derived FGB):** the pipeline projects the ISO range onto the integer-year
  fields the renderer consumes — `valid_from = year(start_date)`,
  `valid_to = year(end_date)` or the open-ended sentinel **`9999`** when `end_date`
  is empty. Both inclusive. See **Decision D4**.
- **IDs:** stable slugs. An **authority id repeats across phases** — the same
  `port_id` (`venice`, `zara`) appears on every status row for that place; likewise
  `waypoint_id`, `polity_id`. A row is uniquely identified by `(id, start_date)`.
- **Provenance:** `source_keys` — **uppercase, semicolon-separated** keys into
  [`sources.csv`](../../data/vmn/sources.csv) (e.g. `LANE1973;OCONNELL2009`) — plus
  free-text `notes`. No inline citations.
- **Phased features:** a place whose status changes appears as **multiple rows
  sharing one id**, each with its own `status` and date range. Ranges **may overlap**
  when a place holds two statuses at once (Venice is both `metropole` and `capital`).
  See **Decision D2**.

## `ports.csv` → `venetian-ports.fgb` — Point (§5.2)

Authority table [`data/vmn/ports.csv`](../../data/vmn/ports.csv). One row per
**status phase**; the same `port_id` recurs for a place that changes (or holds
multiple) statuses.

| Field           | Type   | Notes                                                                                                                  |
| --------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| `port_id`       | string | Stable slug, **repeats across phases** (`venice`, `zara`). Join key for voyages/charters/offices.                    |
| `name_historic` | string | Period name (Ragusa, Modon)                                                                                           |
| `name_modern`   | string | Modern name (Dubrovnik, Methoni)                                                                                     |
| `lat`, `lon`    | float  | Harbour location, EPSG:4326. Harbour-accuracy pass in VMN-8.                                                          |
| `status`        | enum   | Controlled vocab — `metropole` · `capital` · `subject` · `colony` · `protectorate` · `independent` · `leased` · `contested` · `lost` |
| `start_date`    | date   | ISO `YYYY-MM-DD`, required                                                                                            |
| `end_date`      | date   | ISO `YYYY-MM-DD`; **empty = open-ended**                                                                              |
| `polity_id`     | string | Holding power slug (`venice`, `ragusa`)                                                                               |
| `source_keys`   | string | Uppercase, `;`-separated keys into `sources.csv`                                                                      |
| `notes`         | string | Free text; flags judgment calls                                                                                       |

**Target:** 50–70 ports, each status phase a separate row.

**Derived FGB:** the pipeline (VMN-9) emits one Point feature per row, projecting
`start_date`/`end_date` to integer `valid_from`/`valid_to` (`9999` = open) and
carrying `port_id`, `name_historic`→`name`, `status`, `polity_id`, provenance. The
atlas registry graduates the point radius by **`status`** (see `src/lib/geo.ts`).

## `waypoints.csv` (§5.2a)

Authority table [`data/vmn/waypoints.csv`](../../data/vmn/waypoints.csv) for
navigational points that are **not** ports. Voyages may reference either a `port_id`
or a `waypoint_id`.

| Field                     | Type   | Notes                                                       |
| ------------------------- | ------ | ----------------------------------------------------------- |
| `waypoint_id`             | string | Stable slug (`pelagosa`, `capo_d_otranto`)                  |
| `name`                    | string | Display name                                                |
| `type`                    | enum   | `staging_harbour` · `offshore_waypoint` · `cape`            |
| `lat`, `lon`              | float  | EPSG:4326                                                   |
| `start_date` / `end_date` | date   | ISO; usually empty (navigational features are time-neutral) |
| `source_keys`             | string | Uppercase, `;`-separated keys into `sources.csv`            |

## `venetian-possessions.fgb` — MultiPolygon (§5.3)

| Field                     | Type   | Notes                                                                                                                  |
| ------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| `id`                      | string | `pos-` slug incl. phase year                                                                                           |
| `territory`               | string | Stable territory slug (`crete`, `corfu`, `dalmatia`, `negroponte`, `morea`, `cyprus`, `ionian`, `terraferma` optional) |
| `name`                    | string | Display name (Regno di Candia)                                                                                         |
| `status`                  | enum   | `direct_rule` · `protectorate` · `condominium` · `contested`                                                           |
| `valid_from` / `valid_to` | int    | From `events.csv` expansion                                                                                            |
| `source`, `notes`         | string | Provenance; `notes` must flag judgment calls                                                                           |

**Geometry rule:** _never digitize coastline._ Draw generous inland/offshore
extent polygons, then clip via intersection with Natural Earth land (10m) in the
pipeline.

## `venetian-routes.fgb` — LineString (§5.4)

| Field                     | Type   | Notes                                                                                   |
| ------------------------- | ------ | --------------------------------------------------------------------------------------- |
| `id`                      | string | `rte-` slug                                                                             |
| `name`                    | string | e.g. Muda di Romania                                                                    |
| `route_type`              | enum   | `muda` (state galley convoy) · `private` (unarmed round-ship trade)                     |
| `waypoints`               | string | Ordered `port_id`/`waypoint_id`s, **pipe-separated** — join key to ports/waypoints       |
| `commodities`             | string | Pipe-separated tags: `grain\|wine\|slaves\|silk\|spices\|cotton\|wax\|fur\|salt\|sugar` |
| `valid_from` / `valid_to` | int    | Convoy line operating window                                                            |
| `source`, `notes`         | string | Provenance                                                                              |

**Target:** the documented _mude_ — Romania/Black Sea, Alexandria, Beirut/Syria,
Cyprus, Barbary, Aigues-Mortes/Provence, Flanders–London — 6–8 linestrings routed
through actual staging ports.

## Supporting non-spatial tables (§5.5)

- **`events.csv`** — `territory, status, from_year, to_year, event_from, event_to,
source, notes`. One row per possession phase; expands into
  `venetian-possessions.fgb`. **Seed dates are starting values, to be verified
  against Lane & O'Connell in VMN-10** — treat as unfrozen until then.
- **`sources.csv`** — `key, citation, url, license`. Seeded in KAN-145.
- **`commodities.csv`** — `tag, label, direction, note` (reserved for VMN-E7).

## Decisions & deviations from spec

- **D1 — Canonical format is FlatGeobuf; a browser loader is still required.**
  The live reference layer (Roman Empire AD 117) is GeoJSON, and `AtlasMap`'s
  `addGeoLayer` cannot yet consume `flatgeobuf` (decisions.md **B1**). FGB remains
  the canonical, deterministic pipeline output (QA, provenance); rendering on the
  map is gated on adding an FGB loader (or emitting GeoJSON siblings). Does **not**
  block data compilation.

- **D2 — a row is one phase; a place is the set of rows sharing its id.** A
  changing place becomes **multiple rows with the same `port_id`**, each carrying one
  `status` and its own date range. Ranges **may overlap** where a place holds two
  statuses at once (Venice `metropole` + `capital`). No row's status is mutated in
  place; `(id, start_date)` is the unique key. This is the frozen interpretation.

- **D3 — FGB geometry type ≠ registry render-hint.** The per-file geometry
  (Point / MultiPolygon / LineString) is the dataset's own contract. The atlas
  `GeoLayerSchema.geometry` render-hint is a separate enum (extended to `circle`
  for graduated points and data-driven dashed lines in VMN-20). Ports graduate by
  **`status`**; does not affect the data model frozen here.

- **D4 — Authority tables carry ISO dates; the FGB carries derived integer years.**
  The source-of-truth CSVs use ISO `start_date`/`end_date` (empty `end_date` =
  open). The renderer's time-slider is integer-year, so the pipeline (VMN-9)
  derives `valid_from = year(start_date)` and `valid_to = year(end_date)` or the
  open-ended sentinel **`9999`**. The sentinel lives only in the derived FGB, never
  in the authority table.

- **D5 — Authority-table re-freeze (KAN-149).** Ports/waypoints are temporal
  **authority tables** keyed on a stable slug that repeats across phases, superseding
  the earlier gazetteer shape (`prt-`-unique ids, integer years in the CSV, the old
  `type` enum). Driven by the need for other datasets (charters, voyages, offices,
  naval stations) to reference a stable `port_id`. `source_keys` are uppercase and
  `;`-separated into `sources.csv` (normalized to uppercase keys in the same change).

- **D6 — Open-ended lifespans use `9999`, not null (derived FGB only).** Confirms
  §5.1 for FGB numeric-field compatibility (no nullable-int ambiguity across
  pyogrio/GDAL). In the authority tables an open range is an **empty `end_date`**;
  the `9999` sentinel appears only after the pipeline's ISO→integer projection (D4).
