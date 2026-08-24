# In Manibus physical-object inventory

KAN-360 and KAN-361 are implemented as a three-table evidence chain:

- [`in-manibus-inspections.csv`](../../data/dacia/reference/in-manibus-inspections.csv)
  records direct examination of a candidate sheet;
- [`objects.csv`](../../data/dacia/objects.csv) is the production `obj-`
  authority; and
- [`object-evidence.csv`](../../data/dacia/object-evidence.csv) states what an
  object contributes and whether that statement is physical observation,
  bibliographic identification, inference or a CND attestation link.

The inspection table records creator, title/date, edition or unresolved state,
dimensions, recto/verso, folds or binding traces, colour, repairs and marks,
provenance clues, confidence, inspector and date. An object row may be created
only from an inspection whose status is `reviewed`. This makes “physically
held” a checked relationship rather than a catalogue adjective.

Object evidence keeps `observation_basis` separate from `evidence_kind`.
`physical_observation` requires `direct_physical`; a bibliographic identification
or inference cannot silently inherit that authority. Source and attestation IDs
resolve against CND, and related essay slugs must resolve to native essay files.

The committed tables currently contain headers only. No physical inspection was
provided with this batch, so the deterministic generated package reports
`pending_physical_inspection` and the public object corpus remains empty. This
is the required safe state: a scan or existing catalogue description cannot be
promoted into the held-object corpus.
