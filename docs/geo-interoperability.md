# Geo interoperability and comparison

This release closes the optional gazetteer and historical-map comparison
contracts without converting approximate geographic evidence into false
precision.

## Linked Places gazetteer

`/geo/toponyms.lpf.json` is the canonical interchange endpoint. It is a Linked
Places Format 1.1 GeoJSON-LD FeatureCollection with:

- one stable local `@id` per authored place;
- modern, ancient, medieval and variant names;
- WGS84 point geometry in longitude/latitude order;
- exact `closeMatch` links only where an authority identifier has been manually
  verified; and
- a declared reconciliation path for World Historical Gazetteer, Pleiades and
  Pelagios/Peripleo tools.

The ordinary `/geo/toponyms.geojson` endpoint remains available for consumers
that do not understand JSON-LD. Atlas place-name popups link to the local LPF
record, exact authority records where present, and the Pelagios tooling
directory. An omitted external link means “not yet verified”, not “no matching
place exists”.

## Historical overlay evidence boundary

The Cities Remember essay publishes an Allmaps-compatible W3C/IIIF
georeferencing AnnotationPage for the Nolli comparison. Its four control points,
full image mask, transformation choice, source record and limitations are
inspectable at `/annotations/cities-remember-nolli.json`.

The current source is a rights-cleared static public-domain image rather than a
stable institutional IIIF Image Service. The site therefore presents a
deterministic pre-registered comparison with two controls:

- **Blend** changes historical-layer opacity.
- **Swipe** reveals a clipped portion of the historical layer.

This layer is explicitly exploratory. It has no evidence-grade residual and
must not be used to infer parcel, wall or street survival from apparent
coincidence.

Allmaps’ OpenLayers adapter is the preferred upgrade when a future source has a
stable IIIF Image Service or needs runtime projection/warping. It is not loaded
for this pre-registered image, avoiding a large runtime dependency that would
not improve the present evidence.

## Release checks

`npm run geo:interop:validate` fails the build if:

- the annotation loses its control points or evidence disclosures;
- blend, swipe or annotation-download controls disappear;
- the generated LPF collection becomes incomplete or malformed;
- verified authority links stop being HTTPS exact matches; or
- the cross-essay radar loses its meta/native toggle or commensurability caveat.
