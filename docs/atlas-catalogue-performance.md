# Atlas catalogue performance report

KAN-407. Measurements, budgets and the scale trigger that would change the
architecture. Taken on the development host (macOS 12, Node 24) against the
deterministic fixtures in `src/test-support/catalogue-fixtures.ts`.

The question this answers: does the Regime A architecture - static assets, typed
registries, one MapLibre pipeline, no database - still work at 100-200 layers?
It does, with room to spare, and the numbers below say by how much.

## Catalogue projection

Best of 20 runs per size. Collections are generated at eight members each.

| Catalogue  | Layers | Projection | Client rows | Per row | Groups (themes/collections/rooms) | Largest group |
| ---------- | ------ | ---------- | ----------- | ------- | --------------------------------- | ------------- |
| current    | 19     | 0.09 ms    | 19.6 kB     | 1030 B  | 7 / 3 / 6                         | 8             |
| 100 layers | 100    | 0.31 ms    | 73.1 kB     | 731 B   | 6 / 13 / 7                        | 17            |
| 200 layers | 200    | 0.68 ms    | 146.7 kB    | 734 B   | 6 / 25 / 7                        | 34            |

Projection cost is **linear**: doubling the catalogue doubles the time, and the
absolute numbers are sub-millisecond. Per-row size is flat from 100 to 200,
which is the property that matters - the payload grows with the number of layers
and not with what any one layer has to say.

The real catalogue's 1030 B/row is _higher_ than the synthetic 734 B because
real descriptions are longer than generated ones. That is the honest ceiling to
plan against.

## Built Atlas page

| Measure                        | Value                              |
| ------------------------------ | ---------------------------------- |
| `/atlas/` HTML                 | 312 kB                             |
| Gzipped                        | **37.9 kB**                        |
| Catalogue rows in the DOM      | 67 (19 layers across three lenses) |
| Server-rendered layer dossiers | 19                                 |
| Facet panels                   | 5                                  |
| Full builds (120 pages)        | 14.5 s, 15.1 s                     |

Rows outnumber layers because a layer appears once per lens it belongs to. At
200 layers that projects to roughly 700 rows of about six DOM nodes each - large
but not pathological, and every group is collapsed by default so the browser
lays out very little of it. **Virtualization is not justified at this size** and
would cost more in complexity than it returns.

## Assets are not fetched at load

The built page contains **zero** `src`/`href` references to `.geojson`, `.fgb` or
`.pmtiles`, and no preload or prefetch hints for them. Asset URLs appear only
inside the island's JSON payload, where they are strings until a layer is
switched on and `addGeoLayer` asks for one. Browsing the catalogue costs nothing
in bandwidth.

## One canonical layer, one MapLibre registration

A layer discoverable through three lenses is still one row in the projection and
one entry in the active set. Every lens instance writes to the same checkbox, and
only the checkbox's change handler calls `addGeoLayer`; the other instances are
synchronised by setting `checked` directly, which fires no event. Duplicate
source registration is therefore structurally impossible rather than defended
against, and `atlas-catalogue-performance.test.ts` pins the invariant.

## Build-time facet extraction

Facet values are read out of the committed GeoJSON at build time. Five layers
currently declare facets, and full builds sit at ~15 s including every other
validator in the chain - the extraction is not measurable against that.

**No optimization implemented**, per the ticket's instruction not to optimize
speculatively. The threshold to revisit it: **facet extraction exceeding ~2 s of
build time, or more than 40 faceted layers.** At that point the fix is a compact
facet-index manifest generated during the data build, not a change to the
runtime.

## Budgets

Enforced by `src/lib/atlas-catalogue-performance.test.ts`:

- 200-layer projection under **250 ms** (measured 0.68 ms)
- under **900 bytes** per client row (measured 734 B synthetic)
- doubling the catalogue costs less than **6x** the projection time (guards
  against an accidental quadratic, not against a few hundred microseconds)
- no row carries `source`, `license`, `attribution`, `documentationLinks`,
  `essayLinks` or render-hint objects

The budgets sit well above the measurements deliberately: they exist to catch a
regression in kind, not to police noise on a loaded CI box.

## Scale trigger for Regime B

Nothing here argues for a database. The trigger for reconsidering, unchanged
from the original Regime A decision, is a **spatial query or cross-layer
analytical requirement** the static pipeline cannot answer - not catalogue size.
Catalogue organisation alone should never introduce a backend.

Revisit this report if any of these hold:

- the registry passes ~300 layers;
- the gzipped `/atlas/` page passes ~120 kB;
- catalogue projection passes ~50 ms;
- a lens switch or a search keystroke becomes perceptible on a mid-range phone.
