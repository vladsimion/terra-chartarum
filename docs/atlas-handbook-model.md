# The Atlas Handbook: content model, routes and publication contract

Frozen by KAN-410; implemented by KAN-411 (presentation) and KAN-412 (pipeline).
The audit that motivates it is [the Atlas GIS documentation
audit](atlas-documentation-audit.md).

## The three surfaces

| Surface           | Owns                                           | Public runtime dependency |
| ----------------- | ---------------------------------------------- | ------------------------- |
| Terra Chartarum   | Reader-facing scholarly explanation            | Yes - it is the site      |
| GitHub            | Reproducibility: schemas, source data, history | No, but always reachable  |
| Confluence / Jira | Governance and delivery                        | **Never**                 |

A reader must be able to understand any layer's historical claim without
visiting GitHub, and without ever meeting a login. `assertNoGovernanceDependency`
fails the build if a published document links a governance surface.

## The document record

Handbook documents live in `src/content/handbook/` and are validated by
`HandbookDocFields` (frontmatter) plus `HandbookDocSchema` (cross-field rules) in
`src/lib/handbook.ts`.

| Field                                                                                 | Meaning                                                        |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `id`                                                                                  | Stable document identity, kebab-case.                          |
| `docType`                                                                             | One of the seven types below.                                  |
| `pattern`                                                                             | `A` or `B` - see the authoring contract.                       |
| `lifecycle`                                                                           | `published`, `in-review`, `draft`, `internal`.                 |
| `programme`                                                                           | `atlas`, `vmn`, `hanseatic`, `dacia`, ...                      |
| `layerId`                                                                             | Layer records only: the canonical layer explained.             |
| `routeSlug`                                                                           | Route segment for shared types. Not for `layer` or `glossary`. |
| `relatedLayerIds` / `relatedCollectionIds` / `relatedEssaySlugs` / `relatedSourceIds` | Canonical references, resolved at build.                       |
| `referencesDocIds`                                                                    | Shared documents this one defers to instead of restating.      |
| `lastReviewed` / `reviewedBy`                                                         | Review metadata. A public document must carry a review date.   |
| `citation`                                                                            | `version`, `licence`, optional `stableUrl`.                    |
| `technicalLinks`                                                                      | The Advanced/Technical gateway. Never a primary explanation.   |
| `minimalContext` / `anachronismNote`                                                  | Context-layer exemption, and its required warning.             |

### Document types

- **`layer`** - the public explanation of one canonical layer. **At most one per
  layer**: two owners is a validation failure, because two owners means two
  accounts of the same claim.
- **`method`** - how a family of reconstructions was made. Written once and
  referenced, never restated per layer.
- **`evidence`** - a source ledger: instruments, witnesses, interpretation,
  confidence, rights.
- **`data-fields`** - reader-facing field meanings and controlled vocabularies.
- **`glossary`** - one site-wide glossary. A singleton.
- **`editorial-decision`** - a choice that shapes the map, and its reasoning.
- **`technical`** - the reproducibility gateway.

### Lifecycle

Only `published` and `in-review` generate a static page. `draft` and `internal`
never do, and `draft` is the default: a record does not publish because someone
forgot to say it should not. An `in-review` page renders a banner saying its
material has not been cleared and may not be cited as established evidence.

## Routes

```text
/atlas/handbook/                      landing
/atlas/handbook/layers/               layer catalogue index
/atlas/layers/{canonical-layer-id}/   one layer record
/atlas/handbook/methods/{slug}/
/atlas/handbook/evidence/{slug}/
/atlas/handbook/data-fields/{slug}/
/atlas/handbook/decisions/{slug}/
/atlas/handbook/technical/{slug}/
/atlas/handbook/glossary/
```

**The canonical layer ID is always the public slug.** There is no alias and no
mapping table. An alias is a second name for one thing, and the entire epic
exists to stop a layer having two identities; the cost is that renaming a layer
ID becomes a redirect exercise, which is the correct cost to pay.

`/atlas/handbook/decisions/{slug}/` extends the route list KAN-410 was given.
That list named methods, evidence, glossary, data-fields and technical, but the
`editorial-decision` type exists and the landing page owes it an entry point, so
it needed a route. Filing decisions under methods would have merged two
genuinely different kinds of claim.

## Pattern A and Pattern B

**Pattern A** - the repository Markdown _is_ the public content. The record
carries `sourcePath` and **no body**; the pipeline projects the file. Correct
when a document is wholly reader-facing (or wholly technical, for a gateway
page). A Pattern A record with a body is a validation failure: that body would
be the duplicated prose the pipeline exists to prevent.

Where a source file mixes public and internal material, wrap the publishable
parts:

```markdown
<!-- public:start -->

Everything here is rendered publicly.
<!-- public:end -->
```

No markers means the whole file publishes, which is only correct where the
KAN-409 audit classified it as wholly public or wholly technical.

**Pattern B** - a dedicated reader-facing record, authored in the content
collection, referencing canonical layer, source, collection and essay IDs.
Correct when the source Markdown is too technical or too mixed, because in
Pattern A the technical half travels with it.

## Shared documents

One method or evidence record can serve any number of layers. Layer records
point at it through `referencesDocIds`; they do not restate it. This is the rule
that keeps `docs/dacia/shared-gis-layers.md` - cited by five layers - from
becoming five competing accounts of one method when KAN-413 migrates it.

## Release filtering

- Held essays: a public document may not declare an unreleased `relatedEssaySlug`.
  Filtering happens before render, and a public record that still declares one is
  an authoring error rather than something to drop silently.
- Internal documents: a public document may not reference a non-public one.
- Unresolved references: any unknown layer, collection, source or document ID
  fails the build. A public page linking a layer that does not exist is a broken
  scholarly claim.

## Minimal-context exemption

A `context` layer - coastlines, rivers, present-day boundaries - may take
`minimalContext: true` and document only what it owes: source, licence, and for
modern-reference layers an `anachronismNote` that the page renders prominently.
The exemption covers documentation _depth_. It does not cover the warning.

## Coverage

`/data/handbook-coverage.json` lists every published layer and whether it has a
record. This is the report KAN-418 re-runs as its migration inventory check.
