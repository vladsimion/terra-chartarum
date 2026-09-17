# Proposal

## Why

KAN-422 `[ANT-3]` ("Build Coronelli polar corpus and Act III research
package") is the live child of the TERRA INCOGNITA epic (KAN-419); its
blockers KAN-420 and KAN-421 are both Done. The Act III research is
partially written - `docs/antarctica/coronelli-act-iii.md` establishes that
_Atlante Veneto_ Tomo I's polar section carries two Arctic plates and no
southern plate, and argues this is a deliberate judgement rather than an
oversight - but `docs/antarctica/release-readiness.md` records this
explicitly as risk #2: **"The Coronelli act is written but not
releasable."** Three of the section's seven leaves are unread, the globe's
southern calotte has never been examined, the rest of the twelve-volume
_Atlante Veneto_ and the _Libro dei Globi_ are unaudited, and Milanesi - needed to read the patronage context of a commercial plate as argument - is
unconsulted. Two items in the existing annotation plan are also unresolved
(page 76's IIIF column coordinates, and a DeepZoom target for the globe's
calotte). Closing these gaps is what would let Act III's central claim (the
missing southern plate reflects Coronelli's own judgement about which polar
claims were credible, not inattention) stand on its full evidence base
instead of three of seven pages.

## What Changes

- Read the three unread leaves of the _Atlante Veneto_ polar section (Rumsey
  12186.102, .103, .106 - pages 71, 72, 74–75) and extend
  `docs/antarctica/coronelli-act-iii.md` with what they add or complicate.
- Audit the _Atlante Veneto_'s other twelve volumes and the _Libro dei
  Globi_ for any southern-polar content Tomo I's polar section did not
  cover; record a finding either way (nothing found is itself a result).
- Locate a catalogued Coronelli gore set (globe, c.1688) and examine the
  southern calotte specifically; record what is engraved there under the
  same inherited/reported/observed classification already used for the
  plate's legend, and use it to test the "missing plate is a judgement, not
  a gap" argument against a surface (the globe) that cannot leave a blank.
- Consult Milanesi on Coronelli, and record what Pepoli's patronage and the
  Frari workshop's practice imply for reading `Terre Artiche`/`Polo Artiche`
  as argument rather than neutral cartography.
- Resolve the two open items in the existing annotation plan: fix the IIIF
  column coordinates for printed page 76, and add a DeepZoom target for the
  globe's southern calotte (accounting for the gutter fold already noted
  against the plate's central legend).
- Extend `data/antarctica/coronelli-lineage.csv`, `coronelli-annotations.csv`,
  `sources.csv`, and `map-objects.csv` with the new leaves, the gore object,
  and the Milanesi source, each carrying rights/scan metadata and an
  explicit source-lineage classification (inherited / reported /
  observational), consistent with the programme's five-way evidence
  categories (conjectured, reported, observed, surveyed-reconciled,
  disproved).

Non-goals: re-reading pages 70/73/76 (already read), re-litigating the
plate-vs-_Epitome Cosmografica_ distinction (already established), the
Coda's 1915/2022 comparison (release-readiness risk #3, a different act),
the disputed besetment date (risk #4), and anything about the James Caird
or Endurance drift (KAN-428, a different act).

## Capabilities

### New Capabilities
- `antarctica/coronelli-act-iii`: the evidence-completeness requirements for
  the Coronelli Act III research package - which polar-section leaves, atlas
  volumes, globe regions, and secondary sources must be read and classified
  before the act's central claim can be treated as fully supported, and what
  rights/lineage metadata each newly examined object must carry.

### Modified Capabilities
_(none - no existing specs predate this change; `openspec list --specs`
returns none)_

## Impact

- `docs/antarctica/coronelli-act-iii.md` - extended with the new leaves,
  the volume/globe audit findings, and the Milanesi reading.
- `docs/antarctica/release-readiness.md` - risk #2 re-assessed once the
  gaps close (still gated on the `sources-read`/`public-tier`/
  `layers-published` review gates, which this change does not itself
  close).
- `data/antarctica/coronelli-lineage.csv`, `coronelli-annotations.csv`,
  `sources.csv`, `map-objects.csv` - new rows for the newly read leaves, the
  gore/globe object, and the Milanesi source.
- No code or build changes: this is a research/content capability, validated
  the same way existing Antarctica data already is (`src/lib/corpus.ts` and
  the Antarctic rule/build test suite referenced in
  `docs/antarctica/release-readiness.md`).
