# Spec Delta

## Purpose

Defines the evidence-completeness contract for the Coronelli Act III research
package - which polar-section leaves, atlas volumes, globe regions, and
secondary sources must be read, classified, and cited before the act's
central claim (the missing southern plate reflects Coronelli's own judgement,
not inattention) can be treated as fully supported.

## ADDED Requirements

### Requirement: Polar-section leaf coverage is fully recorded

The evidence package SHALL record a reading status for each of the seven
_Atlante Veneto_ polar-section leaves (Rumsey 12186.100–.107). Act III's
central claim SHALL NOT be presented as fully supported while any leaf lacks
a recorded reading.

#### Scenario: A previously unread leaf is read

- **WHEN** one of the three previously unread leaves (Rumsey 12186.102, .103,
  or .106) is read
- **THEN** its reading status, page content, and any bearing on the central
  claim are recorded in `docs/antarctica/coronelli-act-iii.md`, and the
  "3 of 7 leaves read" caveat is updated to reflect the new count

#### Scenario: All seven leaves are read

- **WHEN** all seven polar-section leaves carry a recorded reading
- **THEN** `docs/antarctica/release-readiness.md` risk #2 no longer cites
  unread leaves as a reason the Coronelli act is unreleasable

### Requirement: Atlas-wide and globe audit results are recorded, including negative findings

For each of the _Atlante Veneto_'s other twelve volumes and the _Libro dei
Globi_, and for a catalogued Coronelli gore set's southern calotte, the
corpus SHALL record an explicit audit finding - either identified
southern-polar content, or an explicit "none found" result. A capability
that has not been audited SHALL be distinguishable from one that was audited
and found empty.

#### Scenario: A volume is audited with no southern-polar content

- **WHEN** one of the other twelve _Atlante Veneto_ volumes or the _Libro dei
  Globi_ is audited
- **THEN** an audit record is created (in `sources.csv` or
  `coronelli-annotations.csv`) marking it as audited with no southern-polar
  content found, rather than leaving it absent from the record

#### Scenario: A globe's southern calotte is examined

- **WHEN** a catalogued Coronelli gore set is opened and its southern calotte
  is examined
- **THEN** what is engraved there (or its blankness) is classified under the
  programme's five evidence categories (conjectured, reported, observed,
  surveyed-reconciled, disproved) and recorded against the object's source
  citation

### Requirement: Secondary-source findings are cited against the claims they inform

A finding drawn from a secondary source (e.g. Milanesi, on Pepoli's
patronage and Frari workshop practice) SHALL be recorded as a `sources.csv`
entry and linked from every `coronelli-lineage.csv` claim it bears on.

#### Scenario: Milanesi is consulted

- **WHEN** Milanesi is consulted regarding the patronage or workshop context
  of `Terre Artiche` or `Polo Artiche`
- **THEN** the finding is added to `sources.csv` with a citation, and the
  relevant `coronelli-lineage.csv` claim(s) reference it

### Requirement: Newly examined objects carry rights and scan metadata

Every newly examined Coronelli-related object (a previously unread leaf
image, or a gore/globe set) SHALL carry rights status and scan-source
metadata in `map-objects.csv` before it may be cited as evidence, consistent
with the programme's `image-rights` and `sources-read` release gates.

#### Scenario: A new map-object row is added without rights metadata

- **WHEN** a new Coronelli-related row is added to `map-objects.csv`
- **THEN** corpus validation SHALL reject the record unless it includes
  rights status and scan-source fields

### Requirement: The Act III annotation plan has no unresolved regions

The annotation plan SHALL specify concrete IIIF or DeepZoom region
coordinates for every planned annotation target, including printed page 76
and the globe's southern calotte, accounting for the known gutter-fold
constraint on the plate's central legend.

#### Scenario: Both previously unresolved targets are specified

- **WHEN** IIIF column coordinates for page 76 and a DeepZoom target for the
  globe's southern calotte are both specified
- **THEN** the Act III annotation plan in `coronelli-annotations.csv` has no
  remaining entry marked as an unresolved region
