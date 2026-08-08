# Hanseatic research and GIS pipeline

The HSE pipeline compiles evidence-led research tables into Atlas layers,
FlatGeobuf and typed essay payloads:

```text
data/hanseatic/sources + traced routes
  -> scripts/hanseatic/build.py
  -> public/geo/hanseatic-{places,routes,events}.geojson
  -> public/geo/hanseatic-places.fgb
  -> Atlas GeoLayer registry
  -> src/data/hanseatic/generated/*.json
```

Run `npm run hanseatic:build` after changing an authority table or trace, then
`npm run hanseatic:validate`. Generated assets are committed so builds remain
serverless and reproducible. The content-addressed manifest is deliberately
timestamp-free; identical inputs must produce identical bytes.

KAN-303/304/305 provide the evidence apparatus: `terminology.csv`, `corpus.csv`,
`chronology.csv` and `kontore.csv`, plus promotion rules that stop unfinished
research being published as settled fact. KAN-306/307/308 add the production
gazetteer, publication assets, routes, normalized commodity joins and mapped
institutional events. The current release contains 60 places/phases, seven
corridors, ten commodity families, 22 joins and 16 events.

See [`data-dictionary.md`](./data-dictionary.md) for schemas and
[`decisions.md`](./decisions.md) for editorial qualifications. In particular,
the broad place phases are not membership dates, route lines are generalized,
and no unsupported traffic volume is encoded.

The validation rules are covered by
[`scripts/hanseatic/test_build.py`](../../scripts/hanseatic/test_build.py): each
test copies the committed sources, breaks one rule, and asserts that
`validate_inputs()` rejects the result. Run them with `npm run hanseatic:test`
or `.venv/bin/python -m pytest scripts/hanseatic -q`.
