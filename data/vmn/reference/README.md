# VMN public-domain reference plates

The registry in [`manifest.json`](manifest.json) maps every `events.csv` territory
to at least one inspectable public-domain plate. Allmaps-compatible W3C Web
Annotations live beside it and retain the image mask, control points, transformation,
source record and evidence warning.

The first accepted plate is William R. Shepherd’s _The Byzantine Empire, 1265–1355_
from the 1911 _Historical Atlas_ (Internet Archive leaf 88). Its upper map covers all
seven territories in the current possession-phase table. The annotation uses four
printed graticule intersections and a first-order transformation.

These registrations are **reference evidence, not geometry sources**. The authored
phase extents remain in `possessions-extents.geojson`; the build clips them against
the pinned Natural Earth 1:10m land layer. Apparent colour boundaries or coastlines on
the Shepherd plate must not be copied as cadastral precision.
