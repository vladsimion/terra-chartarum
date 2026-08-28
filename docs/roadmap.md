# Essay roadmap & backlog

Terra Chartarum grows one essay at a time, but it grows toward a shape: the
[seven-room cosmography](../src/data/rooms.ts). This page is the **prioritised
plan** for which essays come next, why they are ordered as they are, and how each
becomes a tracked epic. It is a companion to the authoring path in
[`CONTRIBUTING.md`](../CONTRIBUTING.md) and the quality bar in the
[essay definition of done](essay-definition-of-done.md).

The canonical backlog lives in Jira (project **KAN**, `TC-cosmography` label); this
document is the human-readable digest. Where the two disagree, Jira wins - but keep
this page current when waves are re-groomed.

## How the roadmap is organised

- **Rooms are the destination.** The atlas is "done enough to feel whole" when each
  of the seven rooms holds at least two essays that argue, not merely illustrate.
- **Waves are the cadence.** Each wave lands one **anchor essay per under-served
  room**, then broadens. Waves are gated on the previous wave's retro.
- **Every essay is an epic.** A new essay is scoped as a Jira epic seeded from the
  [starter kit](../starter/README.md) sub-task checklist (see
  [Per-essay epics](#per-essay-epics-from-the-starter)).

## Current corpus

The release-aware inventory is generated from the same content gate as the site.
See the [current corpus status](generated/corpus-status.md) for live and held
essays, per-room depth, registry totals, and the current geo release.

## Publication calendar

Held essays are **scheduled, not shelved**. Nine carry real `releaseAt` dates and
publish one a month on the 1st; essays produced by a research programme release on
the 15th when their gates close, at most one a month. `releaseAt` is the whole
schedule - there is no second ordering to keep in step with it.

| Date       | Essay                         | Room    | Stream |
| ---------- | ----------------------------- | ------- | ------ |
| 2026-09-01 | Speculum Chartarum            | Theatre | queue  |
| 2026-10-01 | Invisible Maps of Trade       | Road    | queue  |
| 2026-11-01 | Projection and Perspective    | Map     | queue  |
| 2026-12-01 | The Geography of Power        | City    | queue  |
| 2027-01-01 | Palimpsest Landscapes         | Archive | queue  |
| 2027-02-01 | The Cartography of Empire     | Border  | queue  |
| 2027-03-01 | When Maps Create Countries    | Border  | queue  |
| 2027-04-01 | Invisible Maps of Migration   | Road    | queue  |
| 2027-05-01 | Classification Is Cartography | Theatre | queue  |

The queue is ordered by **room need** rather than by wave order, so the thin rooms
fill first: every room holds at least two essays on **1 January 2027**. This does not
touch `waveOrder` in [`data/editorial/wave-2/backlog.json`](../data/editorial/wave-2/backlog.json),
which is an editorial identity mapping (`waveOrder` ↔ `TC-10.n` ↔ Jira ticket, pinned
by position in `scripts/validate-editorial.mjs`) and not a schedule.

Four essays stay at `2099-01-01` deliberately: `terra-incognita` and `maps-for-a-crusade`
are programme output awaiting their gates and take the 15ths above; `borroczyn` is a stub
whose trench (KAN-324) has not started; `starter-example` is the authoring template and
never releases.

A dated release does not publish itself - the gate is evaluated at build time and
Cloudflare Pages builds on push. [`.github/workflows/scheduled-release.yml`](../.github/workflows/scheduled-release.yml)
fires a Pages deploy hook on the 1st and the 15th so the calendar runs without a manual
push. It needs the `CLOUDFLARE_DEPLOY_HOOK_URL` repository secret; until that exists it
reports what would have published and exits cleanly.

## Wave 1 - anchor each under-served room (complete)

Wave 1 gives every currently-thin room its first purpose-built anchor essay. These
are the **priority topics**, in build order:

| Priority | Epic       | Essay                      | Room        | Why it leads / risk                                                                                                                   |
| -------- | ---------- | -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | **KAN-88** | Cities Remember            | The City    | Corpus is the main risk (few own city sheets) - front-load the rights-check on IIIF externals; new Allmaps town-plan overlay pattern. |
| 2        | **KAN-85** | Invisible Maps of Trade    | The Road    | Launches the recurring "Invisible Maps" series shell; depends on the VMN Atlas time-slider (1350–1450) as its spine.                  |
| 3        | **KAN-86** | Maps That Age              | The Archive | New state-comparison slider pattern; leans on Cartometry Bench measurements for the "accumulating error" argument.                    |
| 4        | **KAN-87** | Invisible Maps of Religion | The Theatre | Second in the "Invisible Maps" series (series nav must show both); integrates existing Speculum material.                             |

**Sequencing rationale:** City leads because its corpus rights-check is the biggest
unknown and must clear early. Trade follows to stand up the "Invisible Maps" series
shell that Religion then reuses. Archive slots between them wherever the
state-comparison slider work is ready. Earth's anchor is deliberately held to Wave 2
(KAN-89 TC-10.1) so the last room closes the set with a retrospective anchor.

## Wave 2 - broaden coverage (KAN-89, gated on Wave-1 retro)

A groomed set of 6–8 essays that take every room past a single entry and reach the
**M3 "≈2 essays per room"** gate. Topics (one-line tickets under KAN-89):

- **The Shape of a Civilization** - The Earth (anchor; closes the last empty room)
- **The Cartography of Empire** - The Border (Sanson / Zatta administrative sheets)
- **When Maps Create Countries** - The Border
- **Projection and Perspective** - The Map
- **The Geography of Power** - The City
- **Invisible Maps of Migration** - The Road
- **Palimpsest Landscapes** - The Archive
- **Classification Is Cartography** - The Theatre

**Wave-2 gate (KAN-90):** once each room holds ~2 essays, promote **Rooms** to the
primary navigation and (optionally) regroup the Essays index by room.

**Platform gate shipped (2026-07-29):** Rooms is now in primary navigation and
the Essays index is grouped by its validated primary-room association. Content
depth remains honest: The Earth stays unanchored until KAN-228 delivers _The
Shape of a Civilization_.

## Wave 3 - normalized backlog (KAN-91, KAN-220)

The twelve candidate titles now have stable slugs, canonical room assignments,
secondary rooms, a fixed wave order and bundle ownership. The machine-readable
authority record is [`data/editorial/wave-3/backlog.json`](../data/editorial/wave-3/backlog.json);
Jira remains the tracking authority.

| Order | Candidate                     | Primary room | Tracking bundle | State   |
| ----: | ----------------------------- | ------------ | --------------- | ------- |
|     1 | The Weight of Distance        | The Road     | KAN-224         | tracked |
|     2 | The Last Blank Spaces         | The Earth    | KAN-224         | tracked |
|     3 | Why North Is Up               | The Map      | KAN-224         | tracked |
|     4 | The Problem of Scale          | The Map      | KAN-222         | tracked |
|     5 | The Soul of Places            | The Earth    | KAN-222         | tracked |
|     6 | Frontiers Are Not Borders     | The Border   | KAN-222         | tracked |
|     7 | The Invention of the Homeland | The Border   | KAN-223         | tracked |
|     8 | Invisible Maps of Disease     | The Road     | KAN-223         | tracked |
|     9 | Ruins as Documents            | The Archive  | KAN-223         | tracked |
|    10 | The Geography of Memory       | The City     | KAN-221         | tracked |
|    11 | Myth as Cartography           | The Theatre  | KAN-221         | tracked |
|    12 | Naming as Cartography         | The Map      | KAN-221         | tracked |

The KAN-224 tracking pass created KAN-286–288 for the final three candidates.
KAN-225 verified all twelve Jira links, canonical room assignments, Editorial
ownership labels, and candidate-specific interactive directions. The project does
not expose a Jira Components field for Tasks, so the `editorial` label is the
machine-checked ownership mechanism.

## Out of wave - Ada Kaleh (KAN-510)

The first essay scoped outside the wave cadence, because it fills the room the waves
left thinnest. **The Earth** still holds one live essay and nothing held; Ada Kaleh is
its second anchor.

| Field           | Value                                                                       |
| --------------- | --------------------------------------------------------------------------- |
| Slug            | `ada-kaleh`                                                                 |
| Epic            | **KAN-510** (children KAN-511-519)                                          |
| Primary room    | The Earth                                                                   |
| Secondary rooms | The Archive, The Border                                                     |
| Lens axes       | Omission; Survey; Contour; Displacement; Evidence; Silence                  |
| Interactive     | `CompareSlider` + `DeepZoomViewer` + `Scrollytelling`, plus a contour raise |
| Scope           | 3,500-4,500 words, ~8-10 maps, no new budgeted pattern                      |

**Argument.** The Danube island submerged by the Iron Gates dam existed because of a
documentary omission, ended because of a drawn contour, and survives only as the
by-product of a reconnaissance programme aimed at something else. The claim the essay
has to defend is that the map was the _instrument_ of the erasure, not its record.

**Corpus is cleared on the modern half and blocked on the historical half.** Corona
imagery is US-government public domain: 47 pre-flood frames confirmed to contain the
island, six of them at KH-4B resolution, including a stereo pair. The Habsburg survey
sheets are _not_ republishable - Arcanum/mapire's terms forbid uploading their scans to
a public platform, the rights holder is BEV (or the Hungarian War Archives, per layer),
and 1:25,000 sheets cannot be bought at all. Scope the comparison around Corona, not a
mapire sheet.

**Gate.** Two blocking spikes must return usable sources before authoring starts:
KAN-511 (the 1878 treaty omission) and KAN-512 (the reservoir flood-contour sheet).
Both are library questions, not acquisition questions.

Full proposal, corpus findings and verification ledger live in Confluence:
[The Island Drawn Out of Existence - Ada Kaleh programme dossier](https://vladsimion.atlassian.net/wiki/spaces/~7012186ee7d7085f34fff9bc2bf8fbe8de309/pages/21692418/The+Island+Drawn+Out+of+Existence+Ada+Kaleh+Essay+Declassified-Imagery+Programme).

## Parked - The River Road (Danube programme)

A Danube programme was proposed and **deliberately not tracked**. Its thesis holds, but
its two load-bearing chapters rest on sheets absent from our registries (Valck, Cantelli,
Seutter) and on 19th-century navigation and engineering material that is archival and
largely undigitised - the weakest corpus sits under the strongest claims. It also aimed
at The Road, already the most crowded room.

It stays parked until Ada Kaleh ships, by which point Ada Kaleh will have built its Iron
Gates section. Rationale and the kept/changed/removed record are in the Confluence page
above.

## Per-essay epics from the starter

Every essay on this roadmap is tracked as a **Jira epic** whose child tasks mirror
the starter kit and the [definition of done](essay-definition-of-done.md). When a
topic is promoted from backlog to active, open (or generate) an epic with this
skeleton so scope and the merge bar are explicit from day one:

1. **Corpus & rights** - assemble source sheets; clear IIIF/external rights early.
2. **Scaffold** - `npm run create-essay -- --slug <slug> --title "<title>"`; set
   frontmatter (eras, regions, lenses, year range, `accent`, canonical `room`).
3. **Cover art** - house-style SVG (dark canvas, one accent, humanist serif title).
4. **Body & argument** - MDX draft making a critical-cartography argument, using
   only the islands it needs and the shared [design tokens](design-tokens.md).
5. **Interactive island(s)** - build/reuse the pattern the essay's argument needs
   (radar, timeline, compare-slider, scrollytelling, or a new budgeted pattern).
6. **Accessibility & performance** - keyboard paths, `alt` text, contrast,
   `prefers-reduced-motion`, Lighthouse ≥ 90.
7. **Review & merge** - self-review checklist, then the definition-of-done gates.

The [new-essay proposal issue template](../.github/ISSUE_TEMPLATE/new-essay-proposal.md)
captures items 1–2 at proposal time so an epic can be generated from a filed idea.

## Keeping this roadmap honest

- Re-groom at each wave retro; move completed epics out of the wave tables.
- Run `npm run reports:write` whenever an essay or registry changes; the production
  build rejects stale generated reports.
- If a topic changes room or priority, change it here **and** on the Jira epic - the
  two must not drift.
