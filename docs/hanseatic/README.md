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

This fixture is intentionally provisional. The full gazetteer belongs to
KAN-306.

KAN-303/304/305 added the evidence apparatus alongside it - `terminology.csv`,
`corpus.csv`, `chronology.csv` and `kontore.csv`, plus the promotion rules that
stop an unfinished row being published as a finished one. The tables are
deliberately unfilled: they hold the shape of the research, not its results. See
[`decisions.md`](./decisions.md) for the vocabulary decisions and what is still
open, and run `npm run hanseatic:validate` for the current readiness score.

The promotion rules are covered by
[`scripts/hanseatic/test_build.py`](../../scripts/hanseatic/test_build.py): each
test copies the committed sources, breaks exactly one rule, and asserts that
`validate_inputs()` rejects the result. Run them with `npm run hanseatic:test`
(or `make hanseatic-test`); CI runs them in the `hanseatic-data` job. pytest is
the only test-time dependency and is not vendored - install it with
`python3 -m pip install pytest`. Add a case here whenever a rule is added, or
the rule will silently stop firing once research data starts filling the tables.
