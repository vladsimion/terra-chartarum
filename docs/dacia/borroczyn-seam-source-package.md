# Borroczyn Uranus-Antim seam source package

KAN-357 selects a bounded comparison area and records the sources needed to
test parcel and street transformation. The versioned boundary is
[`borroczyn-seam.geojson`](../../data/dacia/reference/borroczyn-seam.geojson),
the source/rights ledger is
[`borroczyn-seam-sources.csv`](../../data/dacia/reference/borroczyn-seam-sources.csv),
and both are hash-frozen in
[`research-package-manifest.json`](../../data/dacia/reference/research-package-manifest.json).

## Version 0.1 boundary

`br-seam-uranus-antim` is an EPSG:4326 editorial research envelope:

- west/east: 26.075 / 26.102;
- south/north: 44.417 / 44.437;
- selected: 2026-08-09; and
- complete-city coverage: **false**.

The envelope spans the former Uranus-Antim fabric, the Palace of Parliament
site, and surviving streets on the eastern edge. The UAUIM demolition dossier
documents the area's unusually legible transformation: buildings, vegetation,
street system, and even topography were altered. That makes it a strong seam
for comparing erased, relocated, and surviving fabric across 1844-1852, 1911,
the pre-demolition period, and today.

The rectangle is deliberately not a reconstructed neighbourhood boundary,
cadastral parcel, or historical source geometry. Expanding to complete
Bucharest would require a new version and justification.

## Source and rights matrix

| Source                             | Detail                     | Rights                      | Use now                                                 |
| ---------------------------------- | -------------------------- | --------------------------- | ------------------------------------------------------- |
| Borroczyn 1844-1846 UAUIM copy     | 1:10,000, 230 MB           | Didactic use only           | Research/georeferencing test                            |
| Borroczyn 1852 UAUIM copy          | 1:5,000, 60 MB             | Didactic use only           | Parcel-resolution research                              |
| Borroczyn 1852 INP/MNLR object 486 | Exact object; 71 x 62.5 cm | Catalogue page CC BY-SA 4.0 | Identity/rights lead; preview too small                 |
| IGA 1911 UAUIM copy                | 1:5,000, 80 MB             | Didactic use only           | Later research comparison                               |
| UAUIM 1962-1978 bundle             | 71 MB bundle               | Didactic use only           | Pre-demolition acquisition lead; file inventory pending |
| OpenStreetMap                      | Live vector database       | ODbL 1.0                    | Modern production reference with attribution            |

UAUIM's page states that the cartographic materials may be used exclusively
for teaching. The validator therefore rejects them from production roles even
though their scales and downloads are sufficient for research. The INP record
supplies exact ownership, accession, dimensions, and a CC BY-SA page licence,
but its catalogue preview is not parcel-resolution evidence.

## Open rights/acquisition debt

The modern comparator is production-ready; the historical comparison is not.
`vd-borroczyn-production-witness` blocks the rights gate until the holding
institution supplies a production-resolution Borroczyn reproduction with
written reuse terms, or an equivalent rights-cleared witness is documented.
The 1962-1978 bundle also needs a file-level inventory before it can support a
pre-demolition claim. KAN-357 therefore remains in progress rather than
claiming acceptance from research-only access.

The downstream KAN-358 transform and KAN-359 held interaction are implemented
against this explicit state. See the
[georeferencing contract](./borroczyn-georeferencing.md). Changing the generated
package to public-ready requires resolving this debt; presentation code cannot
override it.
