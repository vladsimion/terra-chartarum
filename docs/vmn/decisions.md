# VMN — data-model & integration decisions (VMN-2 spike)

Reverse-engineered from the live **Roman Empire, AD 117** reference layer and the
atlas rendering pipeline as they exist in this repo, to freeze spec §5 field
names and flag blockers for D4/D5 (KAN-146). Everything below is grounded in
current code, not the dataset spec's assumptions.

## What was inspected

| Artifact             | Location                                                         |
| -------------------- | ---------------------------------------------------------------- |
| Registry entry       | `src/lib/geo.ts` — `id: 'roman-empire-117'` (+ `GeoLayerSchema`) |
| Geometry asset       | `public/geo/roman-empire-117.geojson`                            |
| Renderer / add-layer | `src/components/islands/AtlasMap.astro` — `addGeoLayer`          |
| Time-slider binding  | `src/components/islands/AtlasMap.astro` — `syncLayerTime`        |

## Findings (freeze these into §5)

1. **The reference layer is GeoJSON, not FlatGeobuf.** The registry declares
   `format: 'geojson'`, `url: '/geo/roman-empire-117.geojson'`. The ticket
   assumed "FGB attributes"; there are none to read. FGB is still the VMN target
   (`format` enum already accepts `flatgeobuf`, and the placeholder
   `venetian-maritime-1400` entry declares it) — but see blocker **B1**.

2. **All metadata lives in the registry entry, not on features.** The GeoJSON is
   a `FeatureCollection` of **112 `Polygon` features, each with `properties: {}`**
   — no ids, no dates, no source per feature. Temporal extent (`yearFrom: 106`,
   `yearTo: 271`), `source`, `license`, `attribution`, `color`, `geometry` all
   sit in the `GeoLayer` registry object. The renderer reads **zero** feature
   properties.

3. **CRS is implicit EPSG:4326.** No GeoJSON `crs` member; lon/lat WGS84 by
   spec default. Matches §5.1. `GeoLayerSchema.crs` defaults `'EPSG:4326'`.

4. **One geometry type per file** holds: the reference file is all `Polygon`.
   VMN's Point / MultiPolygon / LineString-per-file rule (§5.1) is consistent
   with, and stricter than, what the pipeline needs.

5. **Registry schema = the field contract the renderer actually enforces**
   (`GeoLayerSchema`): `id, title, description, kind, format, url, crs, yearFrom,
yearTo, source, license, attribution, gazetteerIds?, essaySlugs?, defaultOn,
geometry ∈ {line,fill}, color, sourceLayer?, room?, secondaryRooms,
roomAnchor`. Each of the three VMN layers must parse as one of these.

## Blocking issues (must resolve before D4/D5 flip)

- **B1 — No FlatGeobuf loader in the map pipeline.** `addGeoLayer` handles only
  `geojson` (→ `addSource type:'geojson'`) and `pmtiles` (→ vector source via the
  `pmtiles://` protocol); **`flatgeobuf` hits the `else { return; }` branch**
  (commented "flatgeobuf/cog need a dedicated loader"). VMN's `.fgb` outputs will
  **not render** until either (a) an FGB→GeoJSON/source loader is added to
  `AtlasMap`, or (b) VMN also emits GeoJSON siblings for the browser while FGB
  stays the canonical/QA artifact. **Recommendation:** keep FGB as the canonical
  pipeline output (QA, provenance, determinism) and add a lightweight FGB client
  loader, tracked as its own ticket feeding VMN-20/D5. This is the single hardest
  dependency for going live.

- **B2 — Time filtering is whole-layer, not per-feature.** `syncLayerTime` only
  toggles a layer's `visibility` when the registry `yearFrom <= cutoff`; it never
  reads a feature's dates and never hides after `yearTo`. VMN's phased model
  (§5.1 — a place's changing status = multiple features with disjoint
  `valid_from`/`valid_to`) and the E3 contraction sequence (1204→1797 revealing
  possessions individually) **require a per-feature MapLibre filter** on
  `valid_from`/`valid_to` vs the slider cutoff. Freeze the field names now
  (`valid_from`, `valid_to`, integer years, open-ended sentinel `9999`); the
  per-feature filter is a renderer enhancement for D5.

- **B3 — `geometry` enum has no point/graduated option; no data-driven styling.**
  `GeoLayerSchema.geometry` is `{line, fill}` only, and `addGeoLayer` applies a
  single flat paint (fill: `l.color` @ 0.22 opacity; line: `l.color`, width 1.2).
  VMN needs **ports as graduated Point symbols by `type`** and **routes dashed by
  `route_type`** (§9). That needs (a) a `circle`/point geometry branch, and (b)
  data-driven paint expressions keyed on feature fields. Extend the schema +
  renderer alongside B1.

## Field-name freeze recommendation

Because the current renderer consumes **no** per-feature fields, §5 per-feature
names are unconstrained by existing code and should be frozen to the spec + FGB /
pyogrio conventions, ready for the B2/B3 renderer work:

- **Common:** `id` (slug — `prt-`, `pos-`, `rte-`), `name`, `valid_from`,
  `valid_to` (inclusive int years; open-ended = `9999`), `source` (→
  `data/vmn/sources.csv` key), `notes`.
- **Ports (Point):** add `type` (drives graduated symbol), name triple fields.
- **Possessions (MultiPolygon):** phase captured by disjoint `valid_from`/`valid_to`
  features, **not** a mutable status field (§5.1).
- **Routes (LineString):** add `route_type` (drives dash style), `waypoints`,
  `commodities`, operating-window fields (reserved for VMN-E7 embeds).

Registry-level (per `GeoLayerSchema`): three entries replacing the single pending
`venetian-maritime-1400` row — `kind: 'vector'`, `format: 'flatgeobuf'`,
`essaySlugs: ['venice-sicily']`, layer-envelope `yearFrom`/`yearTo`, and
`geometry`/`color` once B3 extends the enum.

## Verdict

§5 field names can be frozen as above (VMN-3). Going **live** on the map is gated
on **B1** (FGB loader) with **B2**/**B3** required for the phased time behaviour
and ports/routes styling — none of which block data compilation, but all of which
block the D5 registry flip. Flag B1–B3 into the VMN-20/D5 tickets.
