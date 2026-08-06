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
