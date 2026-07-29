# Wave 3 tracking and Rooms platform - 30-ticket release

Date: 2026-07-29

Branch: `codex/next-thirty-wave3`

## Outcome

Thirty Jira issues were implemented in six dependency-checked batches of five.
The release closes Wave 3 candidate tracking, promotes Rooms into primary
navigation, groups the Essays index by validated canonical room records, and adds
an enforceable outline/narrative review gate before the larger Wave 2 drafts.

The source-dependent Lane/O’Connell chronology (KAN-154 and its citation
children) remains open: this release does not invent page references or
historical verification.

## Six batches

| Batch | Tickets                       | Delivery                                                                                                                                   | Reprioritization                                                                                    |
| ----- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| 1     | KAN-224, KAN-236, KAN-286–288 | Created and normalized the final three Wave 3 candidates; made `/rooms/` a top-level navigation target                                     | The remaining tracked candidates became the prerequisite for final backlog verification             |
| 2     | KAN-277–281                   | Added Jira-linked ownership and candidate-specific interactive directions for five Wave 3 essays                                           | The remaining four candidates were paired with KAN-225 for dependency-safe closure                  |
| 3     | KAN-225, KAN-282–285          | Verified all twelve candidate tickets, rooms, Editorial labels, and interactive contracts; rolled KAN-91 to Done                           | The complete Rooms-navigation child hierarchy became the next unblocked platform slice              |
| 4     | KAN-237, KAN-246–249          | Added typed navigation configuration, canonical Rooms label/order/target, responsive overflow, and unit/browser coverage                   | The grouped Essays index was now unblocked by a stable Rooms route contract                         |
| 5     | KAN-238–242                   | Shipped the room-grouped Essays UI, mapping helper, canonical ordering, counts, responsive presentation, and filter-aware group visibility | Remaining index schema/tests stayed first; editorial safeguards moved ahead of large essay drafting |
| 6     | KAN-243–245, KAN-257–258      | Added Zod-validated index records, four grouping tests, a four-essay cohesion audit, review template, and mandatory manifest review gate   | Next boundary is KAN-229 backlog normalization, then the KAN-228 Earth anchor and Wave 2 essays     |

## Parent reconciliation

- KAN-91 (Wave 3 Essays) is Done after JQL confirmed zero open children.
- KAN-90 (Rooms to primary nav) is Done after JQL confirmed zero open children.
- KAN-240 has zero open children.

## Visible changes

- `Rooms` appears between Essays and Atlas and stays active on both the Rooms
  index and detail routes.
- `/essays/` is grouped by canonical primary room, with glyphs, counts, links,
  responsive card grids, and existing fuzzy/faceted filtering intact.
- Cities Remember uses `public/og/cities-remember.png` as its visible essay hero
  while retaining the SVG gallery cover.

## Editorial and data contracts

- `data/editorial/wave-3/backlog.json` is verified and machine-checks twelve
  unique Jira keys, canonical room vocabulary, Editorial ownership, and
  substantive interactive assignments.
- `EssayIndexRecordSchema` validates slug, title, primary room, and no more than
  two canonical secondary rooms before grouping.
- Published editorial manifests must record approved outline and narrative
  decisions, date, and an existing notes path before Build or later stages.

## Next boundary

1. KAN-229 - normalize the Wave 2 backlog before drafting.
2. KAN-228 - deliver The Shape of a Civilization and anchor the Earth room.
3. KAN-226 - Projection and Perspective.
4. KAN-227 - The Cartography of Empire.
5. KAN-230 - When Maps Create Countries.

KAN-154 remains ahead in raw board rank but is not implementable without the
specified Lane and O’Connell editions or page excerpts.
