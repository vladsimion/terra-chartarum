# The shared Dacia GIS family

Three packages under [`data/dacia/gis/`](../../data/dacia/gis/), compiled by
`make dacia` into four Atlas layers. They are shared: no trench owns them, and
each is meant to be reused by whichever trench needs a baseline, a boundary or a
sheet footprint.

| Package              | Ticket  | Atlas layers                               |
| -------------------- | ------- | ------------------------------------------ |
| `roman-dacia`        | KAN-341 | `dacia-roman-sites`, `dacia-roman-network` |
| `principalities`     | KAN-342 | `dacia-principalities`                     |
| `josephinian-sheets` | KAN-343 | `dacia-josephinian-sheets`                 |

The Roman baseline ships as two layers because the Atlas takes one render hint
per layer, not because it is two datasets. Both are compiled from one table.

## The rule the family is built on

**Geometry is typed by where it came from, and the type is checked.** The
`geometry_provenance` vocabulary was frozen at KAN-330 for exactly this: from
`source_geometry` at one end, through `georeferenced_source` and
`scholarly_reconstruction`, to `editorial_reconstruction` and
`display_generalisation` at the other.

Nothing in this family is digitised from a source sheet. That is not a caveat in
prose - the validator rejects any row here that claims `source_geometry` or
`georeferenced_source`, and the two drawn GeoJSON files must each carry
`surveyedGeometry: false` and a recorded justification. When the first digitised
layer arrives it will have to come with the change that permits it, which is the
point: the rule makes an upgrade in confidence a visible edit rather than a
quiet one.

## Roman Dacia (KAN-341)

`roman-dacia.csv` holds three kinds of feature, and only one of them has
geometry of its own.

- A **site** is a CND place. The row names a `place_id` and nothing else
  spatial; the build reads that place's reference location and carries the
  corpus's own `ref_geometry_provenance` onto the feature. This is what keeps
  the baseline from becoming a second, drifting copy of coordinates the corpus
  already holds, and it is why the validator refuses a site whose `place_id`
  does not resolve.
- A **road** is an ordered list of those same places. The line is what you get
  by joining them, and it is declared `editorial_reconstruction` because that is
  what it is: the route is well attested, the drawn segments are not. Every road
  note says which one it is - `rd-road-danube` is straight between crossings
  while the real road follows the river.
- A **limes** is the only thing drawn. A frontier system is not a sequence of
  attested towns, so the three corridors live in `roman-dacia-lines.geojson`,
  each a schematic line at provincial scale with low confidence. The dash
  pattern on the Atlas separates them from roads so the two are never read as
  the same kind of claim.

The identifications follow the Barrington Atlas and TIR L-34/L-35. Those works
are in copyright; this layer cites them and reproduces nothing from them, which
is what `rights_status: in_copyright` records.

## Principality phases, 1526-1859 (KAN-342)

Twelve phases across six polities. **Change over time is phases, not one
polygon**, and the validator enforces the arithmetic: a phase must begin in the
year of the instrument that opened it, and two phases of one polity may not
overlap in time. An overlap means a boundary was moved on one side of a treaty
and not the other.

Bounds are inclusive at both ends, because the Atlas filter is `valid_from <=
year <= valid_to`. A phase therefore ends the year _before_ the instrument that
replaced it - Wallachia-with-Oltenia runs to 1717 and the reduced phase begins
in 1718 - or both would render on the changeover year, which is the overlap the
validator refuses.

The phases exist because the territory moved:

| Year | Instrument          | What changes                                    |
| ---- | ------------------- | ----------------------------------------------- |
| 1526 | Mohács              | Wallachia and Moldavia under Ottoman suzerainty |
| 1541 | Fall of Buda        | Transylvania becomes a principality             |
| 1699 | Karlowitz           | Transylvania to the Habsburgs                   |
| 1718 | Passarowitz         | Oltenia to Habsburg administration              |
| 1739 | Belgrade            | Oltenia restored to Wallachia                   |
| 1775 | Habsburg annexation | Bukovina detached from Moldavia                 |
| 1812 | Bucharest           | Bessarabia to Russia                            |

**Modern national borders are never used as proxies.** That is the failure this
layer exists to avoid: a 1947 line drawn over 1718 makes Habsburg Oltenia
invisible, and makes Moldavia-before-the-Prut invisible too. The rings are drawn
from the territorial record instead, declared `editorial_reconstruction`, given
low confidence, and the GeoJSON carries `derivedFromModernBorders: false` as a
checked field. They are envelopes for temporal filtering, not delimitations, and
no vertex should be read as a claim about where a boundary ran on the ground.

Two simplifications are recorded as verification debt rather than hidden: the
Budjak is not separated from Moldavia before 1775, and the southern Bessarabian
districts returned in 1856 are not cut as their own phase.

## Josephinian sheet index (KAN-343)

Fifteen footprints over the First Military Survey of Transylvania, 1769-1773,
one for each Transylvanian place in the frozen pilot.

`covers_place_ids` is **recomputed from the footprint at build time** rather
than trusted from the table: a sheet that claims a place outside its own bounds
is a mistake the build should catch, whichever of the two is wrong, and the
validator refuses it either way.

Two things this index deliberately does not do:

- **It does not carry the archive's sheet numbers.** Every row's
  `archive_sheet_id` is `pending`. Inventing a plausible-looking Coll./Sectio
  number would be worse than admitting the gap, and the debt that records it
  blocks Trench A's research gate - the Iosephina stela's attestations cannot be
  reviewed without a sheet locator, and this index is where one would come from.
- **It redistributes no scan.** The sheets are held by the Kriegsarchiv in
  Vienna and the layer links to the repository that may show one.
  `scan_redistributed` must be `no`, checked on every row.

The footprints are a regular graticule approximating the survey's sheet layout,
not the archive's index geometry, which is why they are typed
`editorial_reconstruction` and confidence `low`.
