# VMN data dictionary (frozen — VMN-3)

The frozen field contract for the Venetian Maritime Network dataset, derived from
the spec §5 and reconciled with the VMN-2 findings in
[`decisions.md`](decisions.md). Any deviation from the spec is recorded as a
**Decision** below. IDs and field names here are stable: never reused, never
renamed after first publish.

## Common conventions (§5.1)

- **CRS:** EPSG:4326 (WGS84), lon/lat order. Geometry validated (`is_valid`, no
  self-intersections); polygons OGC-wound.
- **One geometry type per file** (FGB constraint): Point / MultiPolygon /
  LineString respectively.
- **Time:** integer years; `valid_from` and `valid_to` both **inclusive**.
  Open-ended = sentinel **`9999`**.
- **IDs:** stable slugs — `prt-candia`, `pos-crete-1211`, `rte-muda-alexandria`.
- **Provenance:** every feature carries `source` (a key into
  [`sources.csv`](../../data/vmn/sources.csv)) and free-text `notes`.
- **Phased features:** a place/territory whose status changes appears as
  **multiple features with disjoint time ranges**, not one feature mutated over
  time. See **Decision D2** on how this coexists with the `status`/`type` fields.

## `venetian-ports.fgb` — Point (§5.2)

| Field                     | Type   | Notes                                                                                                                       |
| ------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| `id`                      | string | `prt-` slug                                                                                                                 |
| `name`                    | string | Conventional English/scholarly name (Modon)                                                                                 |
| `name_venetian`           | string | Venetian form (Modon)                                                                                                       |
| `name_modern`             | string | Modern name (Methoni)                                                                                                       |
| `type`                    | enum   | `colony` · `trading_quarter` · `staging` · `independent` · `rival_genoese` · `metropole`                                    |
| `valid_from` / `valid_to` | int    | Years of that status phase (inclusive; `9999` = open)                                                                       |
| `region`                  | enum   | `adriatic` · `ionian` · `aegean` · `crete` · `constantinople` · `black_sea` · `levant` · `cyprus` · `sicily_south` · `west` |
| `essay_anchor`            | string | Optional anchor slug into _La Rotta e il Catasto_                                                                           |
| `source`, `notes`         | string | Provenance                                                                                                                  |

**Target:** 50–70 ports, each status phase a separate row. Coordinates: modern
harbour location where they differ.

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
| `waypoints`               | string | Ordered `prt-` ids, **pipe-separated** — join key to the ports layer                    |
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

- **D2 — `status`/`type` describe a phase; temporal change is still modelled as
  separate features.** §5.1 says a changing place becomes multiple disjoint-time
  features; §5.2/§5.3 also give each feature a `type`/`status` enum. These are
  compatible: **each feature is exactly one phase**, carrying one `type`/`status`
  value plus its own `valid_from`/`valid_to`. No feature's status is mutated in
  place. This is the frozen interpretation.

- **D3 — FGB geometry type ≠ registry render-hint.** The per-file geometry
  (Point / MultiPolygon / LineString) is the dataset's own contract. The atlas
  `GeoLayerSchema.geometry` render-hint is a separate `line`/`fill`-only enum
  that must be extended for graduated Point (ports) and data-driven dashed lines
  (routes) — decisions.md **B3**. Tracked for VMN-20; does not affect the data
  model frozen here.

- **D4 — Open-ended lifespans use `9999`, not null.** Confirms §5.1 for FGB
  numeric-field compatibility (no nullable-int ambiguity across pyogrio/GDAL).
