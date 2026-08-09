# Lifecycle, review, rights and publication authority

KAN-378 replaces prose-only status with one shared lifecycle. The normative
state and transition graph is the `publication` section of
[`data/contracts/terra-chartarum.json`](../../data/contracts/terra-chartarum.json).

## Lifecycle

| State             | Entry evidence                                                                     |
| ----------------- | ---------------------------------------------------------------------------------- |
| `proposed`        | Scope, owner and intended output are named                                         |
| `researching`     | Source plan or evidence ledger exists                                              |
| `verified`        | Required claims/rows meet the evidence contract and a human verifier is recorded   |
| `ready-for-build` | Accepted data/schema and cleared or explicitly excluded assets exist               |
| `in-build`        | Implementation has an owner and a reproducible working path                        |
| `qa`              | Build is complete enough to run every applicable release gate                      |
| `publishable`     | Historical, data, rights and release approvals are recorded and green              |
| `published`       | The approved artifact is externally available with stable IDs                      |
| `blocked`         | A named missing decision, dependency, right or source prevents the next transition |
| `superseded`      | A replacement or no-replacement decision is recorded; IDs remain reserved          |

The machine file defines the allowed transition graph. Moving backwards for a
correction is valid and preserves history. `blocked` is a state with evidence,
not a euphemism for work that has not started. A superseded record is retained
with its replacement/migration links.

## Human review

OCR, HTR and LLM-assisted normalization may move a row no further than the
specialist programme's pre-review state. A named human must verify the source,
locator, normalized value and confidence before the artifact can become
`publishable`. Automated validation proves consistency, not scholarly approval.

The roles are separate even if one person currently fills all of them:

- **Historical verification** accepts claims against evidence and locators.
- **Data acceptance** accepts schema, vocabulary, provenance and integrity.
- **Rights clearance** records the applicable licence/restriction and conditions.
- **Release approval** confirms every applicable gate before publication.

## Rights

The canonical states are `unknown`, `researching`, `restricted`,
`cleared-with-conditions`, `cleared` and `not-publishable`.

Only the two cleared states can support publication. Conditions must be carried
into attribution and delivery. `restricted` means a real restriction is known;
`unknown` means the rights research is incomplete. `not-publishable` is an
explicit decision and does not prevent the metadata record itself being retained.

## Jira and repository manifests

Jira remains a delivery view, so its three workflow states map to ranges rather
than replacing the scholarly lifecycle:

- **To Do:** proposed through ready-for-build.
- **In Progress:** in-build, QA or a currently blocked implementation.
- **Done:** publishable, published or superseded, with the precise repository
  state still recorded in the release manifest.

Every release-facing manifest must identify the lifecycle state, evidence/review
decision, rights state, role-holder(s), stable entity reference and applicable
QA gates. Existing specialist manifests may retain their current field names if
their documented mapping is unambiguous.
