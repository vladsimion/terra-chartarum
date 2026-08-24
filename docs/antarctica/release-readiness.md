# TERRA INCOGNITA release readiness (KAN-432)

**Verdict: not release-ready.** The essay is held at `releaseAt: '2099-01-01'`
and the Atlas layers are all `in-review`.

This report is computed rather than written. `src/lib/antarctica-release.ts`
evaluates the gates against the corpus, and `antarctica-release.test.ts` fails
if the essay's release date ever stops agreeing with them. A readiness report a
person types is a report about the day it was typed.

## The gates

| Gate                  | Question                                                                      | State       | Closed by |
| --------------------- | ----------------------------------------------------------------------------- | ----------- | --------- |
| `geometry-provenance` | Does every published geometry declare where it came from?                     | **Pass**    | machine   |
| `ghost-context`       | Can every disproved feature answer who claimed it and why that was plausible? | **Pass**    | machine   |
| `nothing-default-on`  | Is any unreviewed layer shown to a reader who asked for nothing?              | **Pass**    | machine   |
| `sources-read`        | Has every record been read against the source it names?                       | **Blocked** | review    |
| `public-tier`         | Is anything cleared for citation as established evidence?                     | **Blocked** | review    |
| `layers-published`    | Has any Antarctic layer left the in-review lifecycle?                         | **Blocked** | review    |
| `image-rights`        | Is any historical map cleared for reproduction?                               | **Blocked** | rights    |

Every gate a machine can close is green. Every gate that is blocked needs either
a person reading a source or an institution answering a letter, and no amount of
further engineering will move one of them.

## What that means in practice

The **engineering is done and demonstrable**. Data validates, the build is
deterministic and hash-checked, the Atlas and the essay read one projection,
every layer has a public Handbook record, nothing is on by default, and the
accessibility and static-fallback work is in the components.

The **scholarship is not started in the sense that matters**. Every source
locator is pending. Nothing has been read against an edition. No claim in the
ledger has been reviewed. No map object may be reproduced.

That is not a criticism of the work; it is the state a research programme is in
after its foundation is built and before anyone has been to a library. What
matters is that the state is legible, and that the software cannot quietly
misrepresent it.

## What ships and what does not

**Ships now:** four Atlas layers marked in review with public documentation, the
Terra Incognita collection with no defaults, the data dictionary and the
programme documentation.

**Held:** the essay, and with it the `CooksBlank` and `EnduranceDrift`
interactives, which have no page until it is released.

The hold is enforced in three places. The essay's `releaseAt` sentinel keeps it
out of the build; a unit test asserts that the sentinel agrees with the corpus
state; and an end-to-end spec proves the route 404s and the essay is absent from
both the search index and the sitemap.

## Accessibility and interaction

Verified in the components and by unit test rather than in a browser, because
there is no page to load them on:

- both interactives render every step, caption and table server-side, and only
  become steppers once script runs;
- arrow, Home and End keys move between steps; targets are at least 44px;
  selection is weight and underline, never colour alone;
- there is no animation to disable, so reduced motion gets the identical figure;
- `EnduranceDrift` carries two captioned tables - phases with whether the ship
  was under her own power, and positions with how each was arrived at;
- evidence tables scroll rather than crush below 40rem.

Axe, mobile layout and deep-link restoration remain **unverified**, and will be
run against the essay route when the hold lifts. Recorded as an exception rather
than claimed.

## Residual risks accepted

1. **Positions are recorded from the general literature.** Approximate, at `raw`,
   with pending locators. They are labelled as such in the data and in every
   layer record, and none may be cited.
2. **The Coronelli act cannot be written.** The plate has not been seen. If the
   search evidence about its Arctic weighting holds, the act improves rather than
   collapses, but that has to be established rather than assumed.
3. **The Coda draws no comparison.** Neither the 1915 nor the 2022 coordinate is
   held from a source this project has read, and secondary reporting conflates
   them.
4. **The besetment date is disputed** in the sources seen: 18 or 19 January 1915.
   The dataset records 19 January and logs the disagreement.

## What would change the verdict

In order of leverage: read Bergman and Stuart on the Endurance position and its
chronometer companion; write to RMG Images about the two verified charts; retrieve
the Coronelli plate; open the Wilkes atlas at the Library of Congress and find the
disputed sheet; consult Headland's chronology and check every date in the
observations table against it.
