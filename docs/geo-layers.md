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

## Register and load a layer

1. Add the source/licence/CRS/temporal record to `data/geo/catalog.json`.
2. Put the publishable `.geojson`, `.fgb` or `.pmtiles` asset in `public/geo/`.
3. Register the same ID and metadata in `src/lib/geo.ts`.
4. Run `npm run geo:manifest`, `npm run geo:validate` and the relevant format
   validator.

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
