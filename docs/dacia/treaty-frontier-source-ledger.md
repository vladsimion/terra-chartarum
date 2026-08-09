# Treaty and frontier source ledger, 1829-1947

KAN-351 freezes the legal-source minimum for the treaty/frontier workstream
before digitisation. The ledger is
[`treaty-frontier-sources.csv`](../../data/dacia/reference/treaty-frontier-sources.csv),
and its eight minimum IDs and file hash are fixed in
[`source-ledger-manifest.json`](../../data/dacia/reference/source-ledger-manifest.json).

## Frozen instruments

| Date       | Instrument                       | Type              | Geometry decision                                                           |
| ---------- | -------------------------------- | ----------------- | --------------------------------------------------------------------------- |
| 1829-09-14 | Treaty of Adrianople             | Final instrument  | Text only; identify a delimitation source separately.                       |
| 1856-03-30 | General Treaty of Paris          | Final instrument  | Boundary commission geometry required.                                      |
| 1878-07-13 | Treaty of Berlin                 | Final instrument  | Treaty map exists but is not georeferenced or reconciled to the commission. |
| 1913-08-10 | Treaty of Bucharest              | Final instrument  | Acquire the cited official volume and delimitation records.                 |
| 1920-06-04 | Treaty of Trianon                | Final instrument  | Treaty maps are not georeferenced; later GIS is not authority.              |
| 1940-08-30 | Second Vienna Award              | Arbitration award | The referenced annex map has not been acquired.                             |
| 1944-09-12 | Armistice Agreement with Romania | Armistice         | Provisional legal context; no final geometry.                               |
| 1947-02-10 | Treaty of Peace with Romania     | Final instrument  | Extract and assess Annex I as its own source before digitisation.           |

The sequence distinguishes final treaties, an arbitration award, and an
armistice. The schema also reserves distinct types for `proposal_map`,
`negotiated_line`, `implementation_instrument`, and `later_reconstruction`.
Those records must be added separately; they must never be folded into the
final instrument whose interpretation they illuminate.

## Interpretation and confidence

Each row carries the signing date and precision, legal context, territorial
scope, full citation, article/page locator, repository, stable URL, rights
posture, interpretation state, alternatives, confidence, and geometry status.
An `ambiguous` or `disputed` row is invalid without named alternatives.

The alternatives deliberately distinguish:

- the legal wording in an instrument;
- an attached or treaty-era map;
- the boundary commission's later delimitation or demarcation;
- national implementation records; and
- later scholarly or GIS reconstruction.

Confidence describes the present interpretation of the candidate source, not
the positional accuracy of uncreated geometry. All rows remain `candidate`.

## Geometry rule

The only allowed states before digitisation are `no_geometry`,
`commission_geometry_required`, `map_not_georeferenced`, and
`annex_map_unacquired`. There is intentionally no `authoritative_modern_gis`
state. A modern boundary layer can be a finding aid or comparison, but it cannot
become authoritative merely because it is convenient or machine-readable.

Digitisation can begin only after the relevant treaty text, map, and
implementation record have separate typed entries and their differences have
been adjudicated. Geometry then needs its own provenance, uncertainty, and
review evidence under the GIS ticket.

## Rights posture

The Hertslet volumes are public-domain text in research scans. U.S. Department
of State documentary-series pages are U.S. government works. United Nations
volumes and the official-series pointer for the 1913 treaty remain explicitly
`rights_review_required` or `un_reuse_review_required`; access is not treated as
blanket permission to republish scans or maps.
