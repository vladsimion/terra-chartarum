# Essay roadmap & backlog

Terra Chartarum grows one essay at a time, but it grows toward a shape: the
[seven-room cosmography](../src/data/rooms.ts). This page is the **prioritised
plan** for which essays come next, why they are ordered as they are, and how each
becomes a tracked epic. It is a companion to the authoring path in
[`CONTRIBUTING.md`](../CONTRIBUTING.md) and the quality bar in the
[essay definition of done](essay-definition-of-done.md).

The canonical backlog lives in Jira (project **KAN**, `TC-cosmography` label); this
document is the human-readable digest. Where the two disagree, Jira wins — but keep
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

Nine essays are live across six of the seven rooms:

| Room        | Live essays                                            | Status        |
| ----------- | ------------------------------------------------------ | ------------- |
| The Earth   | —                                                      | Wave 2 anchor |
| The Map     | The Cartographic Sacrifice · Anatomy of a Native Essay | live          |
| The City    | Cities Remember                                        | live anchor   |
| The Border  | Terra Sigillata · Lapidarium Dacicum                   | live          |
| The Road    | La Rotta e il Catasto · Invisible Maps of Trade        | live          |
| The Archive | Maps That Age                                          | live anchor   |
| The Theatre | Speculum Chartarum · Invisible Maps of Religion        | live          |

## Wave 1 — anchor each under-served room (complete)

Wave 1 gives every currently-thin room its first purpose-built anchor essay. These
are the **priority topics**, in build order:

| Priority | Epic       | Essay                      | Room        | Why it leads / risk                                                                                                                   |
| -------- | ---------- | -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | **KAN-88** | Cities Remember            | The City    | Corpus is the main risk (few own city sheets) — front-load the rights-check on IIIF externals; new Allmaps town-plan overlay pattern. |
| 2        | **KAN-85** | Invisible Maps of Trade    | The Road    | Launches the recurring "Invisible Maps" series shell; depends on the VMN Atlas time-slider (1350–1450) as its spine.                  |
| 3        | **KAN-86** | Maps That Age              | The Archive | New state-comparison slider pattern; leans on Cartometry Bench measurements for the "accumulating error" argument.                    |
| 4        | **KAN-87** | Invisible Maps of Religion | The Theatre | Second in the "Invisible Maps" series (series nav must show both); integrates existing Speculum material.                             |

**Sequencing rationale:** City leads because its corpus rights-check is the biggest
unknown and must clear early. Trade follows to stand up the "Invisible Maps" series
shell that Religion then reuses. Archive slots between them wherever the
state-comparison slider work is ready. Earth's anchor is deliberately held to Wave 2
(KAN-89 TC-10.1) so the last room closes the set with a retrospective anchor.

## Wave 2 — broaden coverage (KAN-89, gated on Wave-1 retro)

A groomed set of 6–8 essays that take every room past a single entry and reach the
**M3 "≈2 essays per room"** gate. Topics (one-line tickets under KAN-89):

- **The Shape of a Civilization** — The Earth (anchor; closes the last empty room)
- **The Cartography of Empire** — The Border (Sanson / Zatta administrative sheets)
- **When Maps Create Countries** — The Border
- **Projection and Perspective** — The Map
- **The Geography of Power** — The City
- **Invisible Maps of Migration** — The Road
- **Palimpsest Landscapes** — The Archive
- **Classification Is Cartography** — The Theatre

**Wave-2 gate (KAN-90):** once each room holds ~2 essays, promote **Rooms** to the
primary navigation and (optionally) regroup the Essays index by room.

## Wave 3 — normalized backlog (KAN-91, KAN-220)

The twelve candidate titles now have stable slugs, canonical room assignments,
secondary rooms, a fixed wave order and bundle ownership. The machine-readable
authority record is [`data/editorial/wave-3/backlog.json`](../data/editorial/wave-3/backlog.json);
Jira remains the tracking authority.

| Order | Candidate                     | Primary room | Tracking bundle | State     |
| ----: | ----------------------------- | ------------ | --------------- | --------- |
|     1 | The Weight of Distance        | The Road     | KAN-224         | candidate |
|     2 | The Last Blank Spaces         | The Earth    | KAN-224         | candidate |
|     3 | Why North Is Up               | The Map      | KAN-224         | candidate |
|     4 | The Problem of Scale          | The Map      | KAN-222         | tracked   |
|     5 | The Soul of Places            | The Earth    | KAN-222         | tracked   |
|     6 | Frontiers Are Not Borders     | The Border   | KAN-222         | tracked   |
|     7 | The Invention of the Homeland | The Border   | KAN-223         | tracked   |
|     8 | Invisible Maps of Disease     | The Road     | KAN-223         | tracked   |
|     9 | Ruins as Documents            | The Archive  | KAN-223         | tracked   |
|    10 | The Geography of Memory       | The City     | KAN-221         | tracked   |
|    11 | Myth as Cartography           | The Theatre  | KAN-221         | tracked   |
|    12 | Naming as Cartography         | The Map      | KAN-221         | tracked   |

The first KAN-224 set remains candidate-only until its dedicated tracking pass.
KAN-225 owns interactive-component assignment and final backlog verification; this
normalization does not pre-empt that review.

## Per-essay epics from the starter

Every essay on this roadmap is tracked as a **Jira epic** whose child tasks mirror
the starter kit and the [definition of done](essay-definition-of-done.md). When a
topic is promoted from backlog to active, open (or generate) an epic with this
skeleton so scope and the merge bar are explicit from day one:

1. **Corpus & rights** — assemble source sheets; clear IIIF/external rights early.
2. **Scaffold** — `npm run create-essay -- --slug <slug> --title "<title>"`; set
   frontmatter (eras, regions, lenses, year range, `accent`, canonical `room`).
3. **Cover art** — house-style SVG (dark canvas, one accent, humanist serif title).
4. **Body & argument** — MDX draft making a critical-cartography argument, using
   only the islands it needs and the shared [design tokens](design-tokens.md).
5. **Interactive island(s)** — build/reuse the pattern the essay's argument needs
   (radar, timeline, compare-slider, scrollytelling, or a new budgeted pattern).
6. **Accessibility & performance** — keyboard paths, `alt` text, contrast,
   `prefers-reduced-motion`, Lighthouse ≥ 90.
7. **Review & merge** — self-review checklist, then the definition-of-done gates.

The [new-essay proposal issue template](../.github/ISSUE_TEMPLATE/new-essay-proposal.md)
captures items 1–2 at proposal time so an epic can be generated from a filed idea.

## Keeping this roadmap honest

- Re-groom at each wave retro; move completed epics out of the wave tables.
- Update the **Current corpus** table whenever an essay ships.
- If a topic changes room or priority, change it here **and** on the Jira epic — the
  two must not drift.
