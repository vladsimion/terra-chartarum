# HSE Phase 0 data dictionary

## `places.csv`

One row per dated place/status phase. `id` is phase-specific; `place_id` persists
across phases. `valid_from` and `valid_to` are inclusive integer years.
Coordinates are modern WGS84 longitude/latitude for the relevant urban focus.

Controlled values in this slice:

- `role`: `leading_city`, `market`
- `participation_class`: `documented_collective_participation`,
  `commercial_association_only`
- `certainty`: `high`, `medium`, `low`

## `routes.csv`

One row per generalized corridor. `from_place_id`, `to_place_id` and ordered
`waypoints` resolve to stable `place_id` values. `commodities` is a pipe-separated
set. Geometry is joined from `traced/routes-paths.geojson` by `id`.

## `sources.csv` and `evidence.csv`

Every feature resolves to a source key. Evidence rows resolve a claim to both a
feature and source, carry a page/folio or named section locator, and declare a
review status. `provisional` fixtures cannot be treated as publication-ready
historical evidence.
