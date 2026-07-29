# Wave 2 editorial delivery

Date: 2026-07-29

Canonical intake: KAN-229

Final verification: KAN-235

## Normalization decision

KAN-89 defines eight editorial references, TC-10.1 through TC-10.8. Several child
issue summaries acquired different numeric suffixes while the backlog was being
groomed. The repository therefore treats
`data/editorial/wave-2/backlog.json` as the canonical mapping among editorial
reference, Jira ticket, title, slug, rooms, interactive direction and content
path. Jira keys remain stable; the ledger does not rename history.

## Editorial boundary

The Wave 2 essays are arguments about how maps organise evidence. They do not
claim exhaustive histories of a civilisation, empire, country, projection,
city, migration, landscape or classification system. Each draft names the
scale at which its argument holds, distinguishes a map from the institutions
that use it, and avoids treating a single sheet as direct evidence of a
reader's response.

The essays use openly described comparative sequences rather than simulated
precision. Timelines locate artifacts and institutional moments; they do not
turn chronology into progress. Where the drafts refer to external collections
or scholarship, the reference is presented as a route for verification, not as
rights clearance for a reproduction.

## Review checklist

- The primary room supplies the essay's question rather than functioning as a
  decorative tag.
- Every section ID in frontmatter matches a rendered `Section` anchor.
- Every interactive has a complete prose interpretation and remains legible
  without client JavaScript.
- Dates describe artifacts or institutional events explicitly and do not imply
  an uninterrupted causal line.
- Political boundaries are described as claims, practices and administrative
  effects-not natural facts.
- Projection comparisons state what is preserved and sacrificed.
- Cross-links resolve to existing local routes.
- The backlog validator fixes the eight-ticket order and rejects missing
  delivered content.

## Component assignment

| Editorial ref | Ticket  | Essay                         | Component          | Delivery intent                                                               |
| ------------- | ------- | ----------------------------- | ------------------ | ----------------------------------------------------------------------------- |
| TC-10.1       | KAN-228 | The Shape of a Civilization   | `AdaptiveTimeline` | Compare unlike spatial models without implying a progress narrative           |
| TC-10.2       | KAN-227 | The Cartography of Empire     | `AdaptiveTimeline` | Track inherited administrative sheets and revision moments                    |
| TC-10.3       | KAN-230 | When Maps Create Countries    | `AdaptiveTimeline` | Separate survey, administration, schooling and repeated territorial display   |
| TC-10.4       | KAN-226 | Projection and Perspective    | `AdaptiveTimeline` | Connect projection formulations to preserved and sacrificed spatial relations |
| TC-10.5       | KAN-231 | The Geography of Power        | `Scrollytelling`   | Progress from official jurisdiction through service access to lived refusal   |
| TC-10.6       | KAN-232 | Invisible Maps of Migration   | `AdaptiveTimeline` | Keep archival regimes distinct from the journeys they partially record        |
| TC-10.7       | KAN-233 | Palimpsest Landscapes         | `CompareSlider`    | Strip and restore landscape layers without pretending perfect registration    |
| TC-10.8       | KAN-234 | Classification Is Cartography | `FragmentLedger`   | Make category membership, exclusions and uncertain fragments inspectable      |

The first four delivered drafts instantiate the assigned static timeline. The
second four preserve the final richer island as an explicit build direction
while supplying a complete no-JavaScript argument and, where chronology matters,
an `AdaptiveTimeline`. This keeps component extraction separate from historical
claims and gives KAN-235 an auditable one-to-one assignment.
