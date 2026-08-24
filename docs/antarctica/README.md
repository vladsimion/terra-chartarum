# TERRA INCOGNITA - the Antarctic knowledge programme

Working documentation for KAN-419 and its children. The canonical plan is the
Confluence specification; this directory holds what the repository owns.

The programme's argument is that Antarctica existed on maps for centuries before
anyone saw it, and that discovery did not fill an empty map so much as dismantle
an inherited one. Everything in `data/antarctica/` exists to keep five kinds of
geography apart: conjectured, reported, observed, reconciled and disproved.

## What is here

| Document                                        | Ticket  | What it records                                            |
| ----------------------------------------------- | ------- | ---------------------------------------------------------- |
| [Source and rights audit](source-audit.md)      | KAN-420 | The bibliography, the map-object register and the gaps     |
| [Claim ledger](claim-ledger.md)                 | KAN-421 | Every high-risk proposition and the terminology behind it  |
| [Coronelli, Act III](coronelli-act-iii.md)      | KAN-422 | The Coronelli package and why it is blocked                |
| [Data dictionary](data-dictionary.md)           | KAN-423 | The schema, the frozen vocabularies and the pilot slice    |
| [Discovery era](discovery-era.md)               | KAN-425 | The 1819-1843 sightings and the priority contests          |
| [Ghost geographies](ghost-geographies.md)       | KAN-426 | Features that were reported, drawn, and later found absent |
| [Cumulative synthesis](cumulative-synthesis.md) | KAN-427 | How a coastline accumulated from separate voyages          |
| [Endurance navigation](endurance-navigation.md) | KAN-428 | Plan, drift, fixes and the difference between them         |
| [Atlas family](atlas-family.md)                 | KAN-430 | The four layers, and the pilot IDs they retired            |
| [Release readiness](release-readiness.md)       | KAN-432 | The seven gates, computed, and what is blocking each       |

## The state of it

Nothing here is cleared. Four map objects have had their catalogue records read;
no object may be reproduced; no claim has been reviewed; every source locator is
pending; the public tier is empty and the build asserts that it is.

That is the intended state of a research foundation, not a shortfall against it.
The audit's job at this stage is to make the distance between _we know this
exists_ and _we have read it_ visible, and the open gaps are the measure of that
distance rather than a defect in the record.

Two gaps closed in the second batch, both by reading a catalogue record: the
relationship between the 1874 and 1910 ice charts, and the identity of the second
Greenwich impression of the Cook chart. Three moved to in progress once a citable
source was located for the Endurance position, Worsley's logbook and the Wilkes
atlas.

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

## Reconciliation (KAN-433)

The repository half of the programme close-out. The Confluence half - Volumes
II-IX, the Projects index, the Decision Log and the Build Log - is written after
this batch's CI is green, because a log written from an open pull request
describes a state that may never exist.

|                     |                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Jira range          | KAN-419 (epic), KAN-420 to KAN-434                                                                                                          |
| Dataset             | `ant-pilot-0.1`, schema version 1, `data/antarctica/release/ant-pilot-0.1/`                                                                 |
| Atlas layers        | `antarctica-conjectured-south`, `antarctica-expedition-tracks`, `antarctica-observations`, `antarctica-ghost-geographies` - all `in-review` |
| Collection          | `terra-incognita`, no default composition                                                                                                   |
| Essay route         | `/essays/terra-incognita/` - **held**, `releaseAt: '2099-01-01'`                                                                            |
| Public release date | None. The programme has shipped its Atlas half and holds its essay.                                                                         |

### What actually shipped

The Atlas layers, their Handbook records, the collection, the compiled dataset
and its release manifest, and the two interactives - which are built, tested and
verified in a browser, but have no public page until the essay is released.

### What is held, and on what

Not on engineering. Every gate in [release readiness](release-readiness.md) that
a machine can close is green; the four that block need a person reading a source
or an institution answering a letter.

- **KAN-422** stays open on the Coronelli plate, which has not been seen. The
  package records what is established, what is not, and the finding that may be
  waiting if the plate is retrieved.
- **KAN-424** and **KAN-429** are engineering-complete and verified under
  `npm run test:e2e:held`. They remain open only because the pages they build
  are held with the essay.
- **KAN-431** is drafted in full and held. No claim in it resolves to a source
  anyone has read.
- **KAN-432** has three gates blocked on review and one on rights.

### Deferred, with tickets to raise

- The `dacia` and `maps-for-a-crusade` essays have no `h1`; every heading on
  those pages is an `h2`. Found by the KAN-432 pass, fixed for
  `terra-incognita` only.
- `AdaptiveTimeline` overflows the dacia essay by 27px at 393px, after the
  site-wide essay-bar overflow was fixed.

### The one thing worth carrying to the next programme

A held page is not a finished page kept in a drawer; it is an unrendered one,
and every check that runs on rendered pages is skipping it. Four defects were
sitting behind this hold, three of them affecting published pages. Whatever
holds an essay should also arrange for it to be built and checked anyway -
`playwright.held.config.ts` is how this programme does it.
