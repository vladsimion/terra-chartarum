# Epic reconciliation

The Jira board contained parent epics whose implementation children were Done
but whose own status had not been reconciled. Parent closure is release work:
the current repository must still satisfy the epic objective after later
changes.

`data/release/epic-evidence.json` is the machine-checked register. Each entry
records the completed child set, restates the parent acceptance outcome and
points to the current implementation evidence. `npm run epic:validate` fails if
an evidence path disappears or an epic is missing from its declared batch.

## Batch 9

| Epic   | Outcome reverified                                      |
| ------ | ------------------------------------------------------- |
| KAN-4  | Astro/TypeScript tooling, design tokens, content model  |
| KAN-5  | Unified portal shell, atlas landing and essay gallery   |
| KAN-6  | Four source essays through the isolated shared host     |
| KAN-80 | Canonical seven-room taxonomy and schema enforcement    |
| KAN-81 | Room overview, room routes and cross-linking components |

The external Jira child-status snapshot is recorded in the release update,
after the branch has been pushed. The repository gate deliberately validates
artifacts rather than calling Jira during a local build.

## Batch 10

| Epic   | Outcome reverified                                            |
| ------ | ------------------------------------------------------------- |
| KAN-82 | Room-aware search, glyph system and navigation discovery      |
| KAN-83 | Expanded About manifesto and its two governing arguments      |
| KAN-85 | Invisible Maps of Trade, VMN network and series shell         |
| KAN-86 | Maps That Age, plate-state interaction and cartometry export  |
| KAN-87 | Invisible Maps of Religion and sacred-orientation interaction |

## Batch 11

| Epic    | Outcome reverified                                                    | Board outcome |
| ------- | --------------------------------------------------------------------- | ------------- |
| KAN-9   | Serverless geo tier, temporal layers, LPF and historical overlay      | Done          |
| KAN-84  | VMN roadmap umbrella linked to the Atlas and Invisible Maps of Trade  | Done          |
| KAN-89  | Eight normalized Wave-2 essays and component-assignment gate          | Done          |
| KAN-140 | Routes, paths, first flip and chronology handoff; page checks blocked | In Progress   |

KAN-140 must not move to Done while KAN-250 and KAN-253 remain unresolved. The
same page-source boundary keeps KAN-154 In Progress.
