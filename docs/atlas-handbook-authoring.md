# Publishing an Atlas Handbook document

The end-to-end contributor workflow for KAN-412's pipeline. The model it
implements is [the Handbook content model](atlas-handbook-model.md).

## 1. Decide the document type

| You are writing                          | `docType`            | Route                                 |
| ---------------------------------------- | -------------------- | ------------------------------------- |
| The explanation of one layer             | `layer`              | `/atlas/layers/{layer-id}/`           |
| How a family of reconstructions was made | `method`             | `/atlas/handbook/methods/{slug}/`     |
| A source ledger                          | `evidence`           | `/atlas/handbook/evidence/{slug}/`    |
| Field meanings and vocabularies          | `data-fields`        | `/atlas/handbook/data-fields/{slug}/` |
| A choice and its reasoning               | `editorial-decision` | `/atlas/handbook/decisions/{slug}/`   |
| A reproducibility gateway                | `technical`          | `/atlas/handbook/technical/{slug}/`   |

If several layers need the same prose, it is a `method` or `evidence` record
that they reference, not a paragraph repeated in each of them.

## 2. Choose Pattern A or Pattern B

Ask one question: **is the canonical text already maintained somewhere, and is
it safe to publish as it stands?**

- Yes to both: **Pattern A**. Set `sourcePath`, leave the body empty.
- Yes to the first, no to the second: **Pattern A with markers**, or **Pattern
  B** if the public part would be a minority of the file.
- No to the first: **Pattern B**. This record is the canonical text.

Never copy prose out of a repository document into a Pattern B record. That
creates the second copy the pipeline exists to prevent; project it or reference
it.

## 3. Write the record

Create `src/content/handbook/<id>.md`:

```markdown
---
id: layer-example
title: Example layer
summary: One sentence a reader can act on.
docType: layer
pattern: B
programme: dacia
layerId: example-layer
lifecycle: draft
lastReviewed: '2026-08-23'
relatedLayerIds: []
referencesDocIds:
  - method-shared-example
citation:
  version: 'example-v1'
  licence: 'CC BY 4.0'
technicalLinks:
  - label: Source data
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/...'
---

## What you are looking at

...
```

A layer record's sections, in the order the template expects them: _What you are
looking at_, _How to read this layer_, _Historical scope_, _Sources and
evidence_, _Reconstruction and uncertainty_, _Editorial decisions_, _Data
fields_, _Data and downloads_. Use `##` for each; the in-page navigation is built
from them. A context layer sets `minimalContext: true` and writes only the first
two.

House rules that will fail the build if broken: no em dashes (use a hyphen), and
every heading anchor is generated - do not hand-write IDs.

## 4. Keep GitHub out of the prose

Put repository links in `technicalLinks`, never in the body. The test suite
asserts that no published document body contains a `github.com` URL, because the
point of the migration is that a reader never needs one to understand a claim.

## 5. Publish

Set `lifecycle: published` (or `in-review` if the underlying records have not
been through a human pass) and add `lastReviewed`. A public record without a
review date is a validation failure.

## 6. Preview and validate

```bash
npm run dev
```

Then open `/atlas/handbook/`. Validation runs inside the build, so:

```bash
npm run build
```

fails with every unresolved reference, duplicate route, leaked held essay and
missing review date at once. `npm test` covers the same rules without a build.

## 7. Check coverage

`/data/handbook-coverage.json` lists the published layers that still have no
record. A programme migration is finished when its layers are absent from
`undocumented`.
