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
| `lat`, `lon`    | float  | Harbour location, EPSG:4326. Harbour-accuracy pass done in VMN-8 (city/harbour points verified; Dubrovnik moved to the old port).  |
| `status`        | enum   | Controlled vocab — sovereignty: `metropole` · `capital` · `subject` · `colony` · `protectorate` · `feudatory` · `independent`; tenure/quarter: `commercial_quarter` · `metropolitan_quarter` · `rival_genoese` · `foreign_port` · `trading_post` · `crusader_port` · `leased`; navigational/other: `staging` · `contested` · `lost` |
| `start_date`    | date   | ISO `YYYY-MM-DD`, required                                                                                            |
| `end_date`      | date   | ISO `YYYY-MM-DD`; **empty = open-ended**                                                                              |
| `polity_id`     | string | Holding power slug (`venice`, `ragusa`)                                                                               |
| `source_keys`   | string | Uppercase, `;`-separated keys into `sources.csv`                                                                      |
| `pleiades_id`   | string | Pleiades place id (numeric), **optional** — populated only where it disambiguates a classical port (VMN-8). Empty otherwise. |
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

- **D7 — Duchy of the Archipelago is a feudatory, not a Venetian colony (KAN-150).**
  The Cyclades duchy was founded by Venetian nobles after 1204 and acknowledged
  Venetian suzerainty in diplomatic/commercial matters, but was ruled by the Sanudo
  then Crispo dynasties as a **separate feudal polity**, not administered like the
  Stato da Màr. Its islands (Naxos, Andros, Santorini, Syros, Paros, Mykonos, Milos)
  carry `polity_id = duchy_archipelago` and the new `status = feudatory`. Venice is
  named as `polity_id` only where it exercised direct sovereignty — Crete, the Morea
  fortresses (Modon, Coron, Nauplia, Argos), Negroponte, and Tino after 1390. This
  adds `feudatory` to the controlled vocab (§5.2) and to the atlas graduation ramp.

- **D8 — Quarter vs. colony: merchant enclaves and rivals are not Venetian
  territory (KAN-151).** Constantinople, the Black Sea, the Levant and Egypt were
  reached through **extraterritorial enclaves under a host sovereign**, not through
  administered colonies. The legal distinction is carried in `status`, with
  `polity_id` naming the actual sovereign (not Venice):
  - `commercial_quarter` — merchant enclave under host sovereignty (the Venetian
    Quarter in Constantinople from the 1082 chrysobull of Alexios I; fondachi at
    Alexandria and Beirut).
  - `metropolitan_quarter` — expanded jurisdiction during Latin rule (Constantinople
    1204–1261) but still not a sovereign colony.
  - `rival_genoese` — a Genoese colony/concession, not Venetian: **Pera/Galata**
    (Genoa's principal concession after the 1261 Treaty of Nymphaeum), **Caffa**,
    **Soldaia**, **Chios** (Maona of Chios).
  - `foreign_port` — independent or allied port where Venice held trading privileges
    (Trebizond, Cyprus ports, Beirut, Alexandria, Damietta).
  - `staging` — a logistical waypoint on the galley routes (Messina, Palermo,
    Syracuse, Trapani).

  Constantinople is modelled as **three phased rows on one `port_id`**
  (`constantinople_quarter`): `commercial_quarter` 1082–1204 (byzantine),
  `metropolitan_quarter` 1204–1261 (latin_empire), `commercial_quarter` 1261–1453
  (byzantine); the Latin-Empire capital itself is a separate `constantinople_latin`
  row. Basis: LANE1973 (the chrysobull, the Fourth Crusade partition, the
  Genoese rivalry and Treaty of Nymphaeum).

  **Two node-table statuses fall outside the seven-term legend and are retained as
  distinct pending review:** `trading_post` (Tana — a Venetian fondaco under Golden
  Horde suzerainty) and `crusader_port` (Acre — Kingdom of Jerusalem, fell 1291).
  They could fold into `commercial_quarter` / `foreign_port` respectively if a
  tighter enum is preferred.

- **D9 — Geocode & review pass (KAN-152).** Second pass over the compiled 62-row
  table. **Coordinates:** every row's `lat`/`lon` verified against its harbour;
  points were already harbour-adjacent to three decimals, so the only correction was
  Dubrovnik (`ragusa`), moved from a city-centroid point ~1.4 km NW to the walled
  **old port** (42.640, 18.111). **Sourcing:** confirmed **zero unsourced phases**
  (all 62 rows carry `source_keys`). **Pleiades ids** added a new optional
  `pleiades_id` column, populated **only where a numeric id was verified against
  pleiades.stoa.org and disambiguates the port** — 9 rows: `durazzo` 573193,
  `corfu` 530835, `negroponte` 530827, `canea` 465938, `paros` 599867, `milos`
  570474, `trebizond` 229599, `sinope` 857321, `alexandria` 727070. Left blank
  where verification was ambiguous, to avoid fabricated ids; two look-alike traps
  were explicitly rejected — Pleiades 462386 is **Sicilian** Naxos (not the Cycladic
  duchy seat) and 727120 is **Egyptian** Thonis-Herakleion (not Cretan Candia).
  **Spot-check (10 ports vs. literature):** Venice (metropole 697 / capital
  1204–1797, Lane), Zara (Treaty of Zara 1409, O'Connell), Candia (Regno capital,
  fell after the 21-yr siege 1669), Modon & Coron (the "two eyes", fell 1500),
  Negroponte (fell 1470), Ragusa (independent tributary, not Venetian), Caffa
  (Genoese, fell to Ottomans 1475), Tana (Venetian fondaco under the Golden Horde),
  and Acre (crusader port, fell 1291) — all statuses, polities and dates confirmed
  against Lane 1973 / O'Connell 2009 / Shepherd 1911. No corrections required.
