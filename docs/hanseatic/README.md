# Hanseatic vertical slice

KAN-302 proves the complete HSE source-to-publication path before research-scale
data entry begins:

```text
data/hanseatic/sources + traced route
  -> scripts/hanseatic/build.py
  -> public/geo/hanseatic-*.geojson
  -> Atlas GeoLayer registry
  -> src/data/hanseatic/generated/places.json
  -> native MDX place profile
```

Run `npm run hanseatic:build` after changing an authority table or trace, then
`npm run hanseatic:validate`. Generated assets are committed so builds remain
serverless and reproducible.

This fixture is intentionally provisional. Historical chronology and source
review belong to KAN-304; corpus rights belong to KAN-303; the full gazetteer
belongs to KAN-306. Do not expand this slice while completing KAN-302.
