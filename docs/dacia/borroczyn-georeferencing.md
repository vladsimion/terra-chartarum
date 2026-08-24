# Borroczyn georeferencing and urban authority

KAN-358 is implemented as a fail-closed package. The machine-readable contract
is [`borroczyn-georeferencing.json`](../../data/dacia/reference/borroczyn-georeferencing.json),
the canonical urban feature table is
[`urban-features.csv`](../../data/dacia/urban-features.csv), and the deterministic
projection consumed by the held prototype is generated at
`src/data/dacia/generated/borroczyn.json`.

## Coordinate chain

The source raster remains in pixel space. Ground control points are recorded in
Romanian Stereo 70 (`EPSG:3844`); a second explicit transform produces the web
reference (`EPSG:3857`). The package records the GDAL command sequence so the
transform can be repeated from the same raster and points.

Release requires at least six fit points and two points withheld as independent
checks. RMSE and maximum residual are recorded in metres. Projective and
thin-plate-spline fits are compared, and the simpler transform wins unless the
independent residuals justify the more flexible model.

Those fields are currently empty because no licensed production-resolution
source raster is present. The validator accepts that explicit blocked state and
rejects changing it to `released` without the control points, metrics and a
production-cleared historical source.

## Evidence layers

The package requires exactly three roles:

1. `historical_source` - the raster as received;
2. `georeferenced_derived` - transformed output or geometry derived from it;
3. `modern_reference` - the contemporary OSM/current reference.

They have separate identifiers and statuses. Presentation code cannot merge
them into one unlabelled truth layer.

## Urban entities

`urban-features.csv` is the authority for `urb-` parcels, streets and buildings.
It records the study area, evidence-layer role, source ID, source feature
reference, WKT geometry, geometry provenance, validity, review state and an
evidence note. An urban feature may link to CND later, but is not inserted into
the CND place authority merely to obtain an ID.

The table is empty while the historical witness is blocked. Publishing a row
derived from a research-only source fails `npm run dacia:validate`.
