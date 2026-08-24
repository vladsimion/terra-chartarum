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

## Why the trench is stopped, and where that is written down (KAN-362)

The empty state above is correct, but it was not _reachable_: `ccd-g` carried no
verification debt, so KAN-360, KAN-361 and KAN-362 read as blocked for no stated
reason, which is the condition the debt register exists to end. Three items now
record it, and `review.py blocked` prints them against the tickets they stop:

| Debt                          | Blocks                                        | Ticket           |
| ----------------------------- | --------------------------------------------- | ---------------- |
| `vd-in-manibus-inspection`    | `ccd-g:research`, `ccd-g:data`                | KAN-360, KAN-361 |
| `vd-in-manibus-object-rights` | `ccd-g:rights`                                | KAN-360          |
| `vd-in-manibus-essay-claims`  | `ccd-g:interaction`, `:editorial`, `:release` | KAN-362          |

The order matters and is recorded rather than assumed. The chain is stopped at
its first link, not its last: an object row requires a `reviewed` inspection, and
object evidence requires an object, so the essay is not waiting on writing time.
Nothing in KAN-362 can begin before somebody handles a sheet.
