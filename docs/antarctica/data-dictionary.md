# Antarctic historical GIS schema and pilot slice (KAN-423)

The shared data model for TERRA INCOGNITA, and the vertical slice that proves the
source to data to Atlas to essay path before full compilation begins.

## Tables

| File                      | Holds                                                      |
| ------------------------- | ---------------------------------------------------------- |
| `expeditions.csv`         | Expedition authority records                               |
| `features.csv`            | Claimed, observed and conjectured features                 |
| `tracks.csv`              | Voyage, planned-route, drift and boat-journey lines        |
| `observations.csv`        | Dated fixes, sightings and measurement events              |
| `ghost-geographies.csv`   | Rejected and disputed features, with their original claims |
| `names.csv`               | Historical and cartographic names with time bounds         |
| `feature-map-objects.csv` | Bridge to the canonical map-object register                |
| `feature-evidence.csv`    | Many-to-many evidence links, including to the claim ledger |

Sources, map objects, gaps, claims and terminology live in the ANT-1 and ANT-2
tables and are referenced from here rather than repeated.

## Frozen vocabularies

**Evidence class** (ten values): `conjectured`, `inherited_cartography`,
`reported_not_observed`, `direct_observation`, `instrumental_fix`,
`dead_reckoning`, `scholarly_reconstruction`, `editorial_interpolation`,
`later_confirmation`, `later_disproof`.

The ten exist because collapsing them is the failure this programme is about. A
guess, a copy, a report, a sighting, a sextant reading, a navigator's inference,
a modern reconstruction and our own drawing are eight different things, and a
schema with one `evidence` column would have to pick which of them to lose.

**Geometry provenance** (eight values): `digitised_from_map`,
`transcribed_from_coordinates`, `derived_from_log`, `modern_reference_dataset`,
`scholarly_reconstruction`, `editorial_interpolation`, `editorial_generalisation`,
`not_spatial`.

**Confidence**: `high`, `medium`, `low`, `contested`, `unresolved`.
**Review state**: `raw`, `normalized`, `reviewed`, `approved`, `published`.
**Later status**: `confirmed`, `modified`, `disproved`, `unresolved`, `not_applicable`.

Extending any of these is an editorial decision recorded here, never a per-row
convenience.

## The rules that carry the weight

**Nothing leaves `raw` on a pending locator.** Naming a source is not reading it.
This is the single rule that stops a table from looking complete while resting on
nothing anyone has opened.

**Our own linework never reaches the public tier.** A record whose geometry
provenance is `editorial_interpolation` or `editorial_generalisation` is refused
promotion, whatever else is true of it. Nor may a record at weak confidence be
promoted.

**A planned route must be filed as interpolation.** Act VIII contrasts the
crossing that was announced with the drift that happened. If the plan were filed
as observation, that contrast would be between two things we drew ourselves.

**A record with no geometry stays without geometry.** `not_spatial` is a real
answer. Coronelli's plate has not been seen, so its record carries no coordinates
and is absent from the Atlas rather than given a placeholder point.

**A ghost feature keeps its claim.** The validator requires a claimant, what was
reported, why it was plausible and what later evidence challenged it. A disproof
also requires the source that disproved it. Without those a ghost feature is only
a record that somebody was wrong, which is the presentation the methodology
rejects.

**Latitudes must be southern.** Every coordinate is checked against a southern
window, because a transposed pair is the commonest way a polar track ends up
drawn in the wrong hemisphere.

## The pilot slice

Twelve records covering seven acts: a schematic Terra Australis envelope, the
Coronelli treatment record, Cook's farthest south and a sampled track, a disputed
1820 sighting, the Wilkes ghost segment, the 1910 synthesis, and the Endurance
plan, besetment, drift and reported sinking position.

Nine are mappable. Three carry no geometry on purpose. None is public.

The Terra Australis record deserves a note. It is a latitude envelope, not a
coastline, and its display name says so. No map in the register has been
examined, so there is nothing to digitise, and drawing a plausible southern
outline would manufacture the false confidence the essay exists to examine.

## The build

`scripts/antarctica/build.py` compiles one projection into three assets:

- `public/geo/antarctica-pilot-tracks.geojson` - lines and outlines;
- `public/geo/antarctica-pilot-observations.geojson` - dated points;
- `src/data/antarctica/generated/pilot.json` - everything, including the records
  with no geometry.

The two Atlas assets exist because MapLibre takes one render hint per layer, not
because there are two datasets. `src/lib/antarctica.ts` reads the third, and the
test suite asserts that the Atlas features and the essay records agree on every
record's evidence class, geometry provenance, confidence and review state. That
assertion is the ticket's requirement expressed as a gate rather than a promise.

The build is deterministic: no timestamps, sorted keys, fixed float precision and
a stable row order. `data/antarctica/release/ant-pilot-0.1/manifest.json` records
the schema version, the counts, the licence and a hash for every input and
output, and the validator checks those hashes back. That is what catches a table
edited but never rebuilt.
