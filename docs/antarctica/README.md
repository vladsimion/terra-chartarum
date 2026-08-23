# TERRA INCOGNITA - the Antarctic knowledge programme

Working documentation for KAN-419 and its children. The canonical plan is the
Confluence specification; this directory holds what the repository owns.

The programme's argument is that Antarctica existed on maps for centuries before
anyone saw it, and that discovery did not fill an empty map so much as dismantle
an inherited one. Everything in `data/antarctica/` exists to keep five kinds of
geography apart: conjectured, reported, observed, reconciled and disproved.

## What is here

| Document                                   | Ticket  | What it records                                           |
| ------------------------------------------ | ------- | --------------------------------------------------------- |
| [Source and rights audit](source-audit.md) | KAN-420 | The bibliography, the map-object register and the gaps    |
| [Claim ledger](claim-ledger.md)            | KAN-421 | Every high-risk proposition and the terminology behind it |
| [Coronelli, Act III](coronelli-act-iii.md) | KAN-422 | The Coronelli package and why it is blocked               |
| [Data dictionary](data-dictionary.md)      | KAN-423 | The schema, the frozen vocabularies and the pilot slice   |

## The state of it

Nothing here is cleared. Two map objects have had their catalogue records read;
no object may be reproduced; no claim has been reviewed; every source locator is
pending; the public tier is empty and the build asserts that it is.

That is the intended state of a research foundation, not a shortfall against it.
The audit's job at this stage is to make the distance between _we know this
exists_ and _we have read it_ visible, and sixteen open gaps are the measure of
that distance rather than a defect in the record.

## Running it

```bash
make antarctica            # compile the pilot slice and the release manifest
npm run antarctica:validate
npm run antarctica:test
```

The validator also runs inside `npm run build`, and the rule tests run in CI.
Run the build before the validator: the validator checks the compiled release
against the hashes the manifest recorded, so running it against a stale build
passes against outputs the tables no longer describe.
