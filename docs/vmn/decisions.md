# VMN - data-model & integration decisions (VMN-2 spike)

Reverse-engineered from the live **Roman Empire, AD 117** reference layer and the
atlas rendering pipeline as they exist in this repo, to freeze spec §5 field
names and flag blockers for D4/D5 (KAN-146). Everything below is grounded in
current code, not the dataset spec's assumptions.

**Implementation status (July 2026):** the original B1–B3 integration blockers
are resolved. The atlas lazily decodes FlatGeobuf, filters phased features by the
time slider, renders graduated ports/dashed routes/coastline-clipped possessions,
and offers port detail and region filtering. The findings below retain the spike's
rationale while describing the implemented outcome.

## What was inspected

| Artifact             | Location                                                         |
| -------------------- | ---------------------------------------------------------------- |
| Registry entry       | `src/lib/geo.ts` - `id: 'roman-empire-117'` (+ `GeoLayerSchema`) |
| Geometry asset       | `public/geo/roman-empire-117.geojson`                            |
| Renderer / add-layer | `src/components/islands/AtlasMap.astro` - `addGeoLayer`          |
| Time-slider binding  | `src/components/islands/AtlasMap.astro` - `syncLayerTime`        |

## Findings (freeze these into §5)

1. **The reference layer is GeoJSON, not FlatGeobuf.** The registry declares
   `format: 'geojson'`, `url: '/geo/roman-empire-117.geojson'`. The ticket
   assumed "FGB attributes"; there are none to read. FGB is still the VMN target
   (`format` enum already accepts `flatgeobuf`, and the placeholder
   `venetian-maritime-1400` entry declares it) - but see blocker **B1**.

2. **All metadata lives in the registry entry, not on features.** The GeoJSON is
   a `FeatureCollection` of **112 `Polygon` features, each with `properties: {}`**
   - no ids, no dates, no source per feature. Temporal extent (`yearFrom: 106`,
     `yearTo: 271`), `source`, `license`, `attribution`, `color`, `geometry` all
     sit in the `GeoLayer` registry object. The renderer reads **zero** feature
     properties.

3. **CRS is implicit EPSG:4326.** No GeoJSON `crs` member; lon/lat WGS84 by
   spec default. Matches §5.1. `GeoLayerSchema.crs` defaults `'EPSG:4326'`.

4. **One geometry type per file** holds: the reference file is all `Polygon`.
   VMN's Point / MultiPolygon / LineString-per-file rule (§5.1) is consistent
   with, and stricter than, what the pipeline needs.

5. **Registry schema = the layer contract the renderer enforces**
   (`GeoLayerSchema`): `id, title, description, kind, format, url, crs, yearFrom,
yearTo, source, license, attribution, gazetteerIds?, essaySlugs?, defaultOn,
geometry ∈ {line,fill,circle}, color, sourceLayer?, room?, secondaryRooms,
roomAnchor`, plus optional per-feature styling hints. Each VMN layer parses
   through this contract.

## Resolved integration issues

- **B1 - FlatGeobuf loading: resolved.** `addGeoLayer` lazily imports the
  FlatGeobuf decoder only when an FGB layer is toggled, streams its features into
  a MapLibre GeoJSON source, and leaves FGB as the canonical QA artifact.

- **B2 - Per-feature time filtering: resolved.** `syncLayerTime` composes the
  layer's base style filter with inclusive `valid_from`/`valid_to` expressions.
  The port region facet composes with the same temporal filter.

- **B3 - Data-driven styling: resolved.** The schema accepts `circle`; ports
  graduate by `status`, routes split into solid/dashed sublayers by `route_type`,
  and possessions render as phased fills.

## Field-name freeze recommendation

Because the current renderer consumes **no** per-feature fields, §5 per-feature
names are unconstrained by existing code and should be frozen to the spec + FGB /
pyogrio conventions, ready for the B2/B3 renderer work:

- **Common:** stable layer-specific id, `name`, `valid_from`,
  `valid_to` (inclusive int years; open-ended = `9999`), `source_keys` (→
  `data/vmn/sources.csv` key), `notes`.
- **Ports (Point):** `port_id`, `status` (drives graduated symbol), historic /
  modern / local names, and `region`.
- **Possessions (MultiPolygon):** phase captured by disjoint `valid_from`/`valid_to`
  features, **not** a mutable status field (§5.1).
- **Routes (LineString):** add `route_type` (drives dash style), `waypoints`,
  `commodities`, operating-window fields (reserved for VMN-E7 embeds).

Registry-level (per `GeoLayerSchema`): three entries replacing the single pending
`venetian-maritime-1400` row - `kind: 'vector'`, `format: 'flatgeobuf'`,
`essaySlugs: ['venice-sicily']`, layer-envelope `yearFrom`/`yearTo`, and
`geometry`/`color` once B3 extends the enum.

## Verdict

The three geometry-specific FGB layers are live and validated. The compilation
gate now covers schema, geometry, temporal ranges, provenance, route references,
and coastline containment; the atlas consumes the same frozen fields for
interaction, filtering, and styling.

## D10 - Possession phases and extents (KAN-158–162)

The possession authority table is one row per political phase, and the authored
extent file is keyed by the same `(territory, start_date)` pair. This prevents a
later, wider phase from silently supplying geometry to an earlier, narrower one.

- **Negroponte:** `condominium` (1209–1390) represents Venice’s jurisdiction within
  the tripartite feudal island. It does not claim sole sovereignty over every point.
  `direct_rule` begins in 1390 and ends with the Ottoman conquest in 1470. Both
  phases use the island as a generalized reference extent; status carries the
  jurisdictional difference.
- **Dalmatia:** the 1409 purchase of rights did not instantly extinguish commune
  autonomy. The table therefore uses a `contested` consolidation phase through 1420,
  followed by `direct_rule`. The coastal polygon describes the mapped Venetian
  administrative zone, not cadastral possession or homogeneous local government.
- **Morea:** the 1207–1500 phase is represented by three disjoint envelopes around
  Modon, Coron and the paired Nauplia/Argos holding. It must not render as rule over the entire
  peninsula. The 1685–1715 phase uses a peninsular extent because it models de-facto
  conquest-to-loss. Treaty recognition would instead yield 1699–1718 (Karlowitz to
  Passarowitz); those dates are recorded but deliberately not used for the Atlas
  time filter.
- **Eastern merchant quarters:** Constantinople, Tana and Trebizond remain port
  authority records, not possession polygons. A small enclave symbol would imply
  boundary precision the sources do not support. Cyprus is the only KAN-162
  territory promoted to a possession extent (`direct_rule`, 1489–1571).
- **Reference plate:** Shepherd’s 1911 plate is georeferenced from its printed
  graticule and mapped to every current `events.csv` territory. Its colour washes
  constrain interpretation but do not supply the authored geometry. The plate’s
  period also cannot be projected indiscriminately onto later phases.

All dates remain derived scholarly assertions under `LANE1973` and
`OCONNELL2009`. KAN-154 subsequently completed page-level edition verification;
the discrepancy ledger records the cited value, resolution, and explicit
`not_in_source` cases without manufacturing page citations.
