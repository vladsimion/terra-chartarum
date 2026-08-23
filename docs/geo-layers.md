# Geo-layer publication and atlas integration

Terra Chartarum publishes historical GIS as static, cloud-native assets. The
layer registry in `src/lib/geo.ts` controls presentation; the source catalogue
in `data/geo/catalog.json` records the delivery contract: provenance, rights,
CRS, geometry, temporal coverage and expected feature count. The deterministic
`public/geo/manifest.json` joins that metadata to file size, SHA-256 integrity
and a content-addressed URL.

## Validate and release

```sh
npm run geo:validate   # verify metadata, GeoJSON, hashes, sizes and manifest
npm run geo:manifest   # refresh the manifest after an intentional asset change
make vmn-validate      # inspect VMN FlatGeobuf schema/topology/provenance
```

Review every manifest diff. A changed asset must produce a changed `sha256`,
`version`, URL query and overall release ID. The atlas uses the generated
`?v=<12-char-sha256>` URL, so unchanged assets remain cacheable while a new
binary cannot be confused with the previous release.

## Classify a layer

Every registry entry declares a `role`, and the Atlas classifies, groups and
searches on that rather than on the display title or on which essay owns the
layer. The vocabularies live in `src/lib/geo.ts` and are the single source of
truth.

| `role`        | What the layer claims                                        |
| ------------- | ------------------------------------------------------------ |
| `context`     | Neutral framing geography; asserts nothing about the past.   |
| `historical`  | A reconstructed past state - the scholarly payload.          |
| `evidence`    | What a source depicts or covers, not what was on the ground. |
| `map-overlay` | A georeferenced historical map surface.                      |

Non-context layers also declare a `category` from the closed vocabulary:
`territories-boundaries`, `networks-circulation`, `places-settlements`,
`names-peoples-attestations`, `conflict-campaigns-frontiers`,
`cartographic-evidence`, `historical-map-overlays`. A new category is a
vocabulary decision, not a per-layer choice; narrower families go in the open
`subcategory` field instead.

Three rules are enforced at parse time, so a malformed entry fails the build:

- a `historical`, `evidence` or `map-overlay` layer must declare a `category`;
- a `context` layer must **not** declare one - that is what stops modern
  national boundaries being filed as historical evidence;
- a `map-overlay` outside `historical-map-overlays` must justify itself in
  `categoryException`.

`lifecycle` (`published` / `in-review` / `in-preparation` / `planned`) is a
statement about the scholarship, never about whether the binary exists. A layer
can be `published` with an empty asset - `dacia-attestations` ships its contract
ahead of the human review that will fill it - and asset presence stays the
release manifest's job. `tags` carry search synonyms without touching `title`,
`featured` controls editorial prominence, and `sortWeight` fixes catalogue order.
`collectionIds` references the collection registry.

Documentation links are audited and classified in
[the Atlas GIS documentation audit](atlas-documentation-audit.md): every entry
carries an audience, a canonical owner and a proposed public destination, and a
reconciliation test fails the build if the registry and the inventory diverge.

## Register and load a layer

1. Add the source/licence/CRS/temporal record to `data/geo/catalog.json`.
2. Put the publishable `.geojson`, `.fgb` or `.pmtiles` asset in `public/geo/`.
3. Register the same ID and metadata in `src/lib/geo.ts`, including its `role`,
   `category`, `subcategory`, `tags` and `sortWeight`.
4. Run `npm run geo:manifest`, `npm run geo:validate` and the relevant format
   validator.

For FlatGeobuf, the shared converter reprojects to EPSG:4326, drops extra
coordinate dimensions, repairs invalid geometry and writes a spatial index:

```sh
npm run build-geo-layer -- \
  --input data/source.gpkg \
  --out source.fgb \
  --simplify 0.0001
```

Simplification is opt-in because its defensible tolerance depends on the source
scale. PMTiles inputs must first be normalised GeoJSON; Tippecanoe then applies
its zoom-aware density controls.

`AtlasMap.astro` sends the content-addressed manifest URL to MapLibre. GeoJSON
loads directly. FlatGeobuf is decoded in a worker-friendly dynamic import and
PMTiles registers its protocol lazily. A missing file disables its toggle; a
WebGL or loader failure leaves the server-rendered corpus list available and
announces the failure in the layer status.

## Temporal filtering

The registry envelope (`yearFrom`/`yearTo`) determines whether a complete layer
is relevant. For `perFeatureTime: true`, the slider additionally applies:

```text
valid_from <= selected year <= valid_to
```

Open-ended records compile to `valid_to = 9999`. Layer-specific categorical
styling remains declarative (`graduate` for points and `dash` for lines), so
consumers do not need to reinterpret the authority tables.

## Minimal consumer example

```ts
import { getGeoLayers } from './src/lib/geo';
import { versionedGeoUrl } from './src/lib/geo-release';

const ports = getGeoLayers().find((layer) => layer.id === 'venetian-ports')!;
const url = versionedGeoUrl(ports);
// /geo/venetian-ports.fgb?v=<content hash>
```

Attribution from the registry must remain visible wherever a layer is reused.
