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

## Verification run, 25 August 2026

- **Data and determinism:** 50 Antarctic Python rule/build tests pass, including
  two byte-identical builds and manifest hash verification. The committed
  release validates at 32 records, 25 mappable, none public, with 14 open source
  gaps and no object cleared for reproduction.
- **Types, lint, build and unit tests:** Astro reports zero errors; ESLint is
  clean; the production build and every registry/report/index/Handbook gate pass;
  619 Vitest tests pass.
- **Held essay:** 68 Playwright checks pass in desktop Chromium and a Pixel 5
  viewport, including axe WCAG A/AA, keyboard operation, 44px targets, static
  transcripts, reduced motion, mobile overflow and Atlas state restoration.
- **Public browser flows:** the public hold, Atlas records and cross-links pass.
  Eight MapLibre/visual checks timed out in the four-worker run while the VMN
  screenshot scrub saturated the browser; all affected specs pass when rerun
  serially (51 Atlas/Handbook/facet checks and all three VMN visual checks).
  Firefox and mobile Chrome core flows pass. WebKit and mobile Safari could not
  start because Playwright's current WebKit build does not support this macOS 12
  host; they must run on a supported runner before public release.
- **Performance:** every hard Lighthouse assertion passes. The Atlas produces
  the existing machine-sensitive warnings: performance 0.70 against the 0.80
  warning threshold and total blocking time 2,047ms against the 1,000ms warning
  threshold. Accessibility, best practices, SEO, byte weight, script size, LCP
  and layout shift remain hard-green.

## What that means in practice

The **engineering is done and demonstrable**. Data validates, the build is
deterministic and hash-checked, the Atlas and the essay read one projection,
every layer has a public Handbook record, nothing is on by default, and the
accessibility and static-fallback work is in the components.

The **scholarship is incomplete in the sense that matters for release**. The
Coronelli treatment is now normalized from opened pages, six source records and
four claims are `source_checked`, and five map objects have verified catalogue
identity. But no claim in the ledger has been reviewed, thirty of the
thirty-two pilot records still carry pending locators, and no map object may be
reproduced.

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

Verified in a browser, on the page the essay will actually ship on.

Axe, mobile layout and deep-link restoration were previously recorded here as
unverified, on the grounds that a held essay has no route to load. That was
wrong: `SHOW_UNRELEASED=1` renders the whole collection (`src/lib/release.ts`),
so the page existed the whole time. `playwright.held.config.ts` builds that
variant on its own port and `e2e/antarctica-held-preview.spec.ts` runs against
it - 24 checks, chromium and a Pixel 5 viewport, all passing.

What it proves is narrow and worth stating precisely: the page is accessible,
usable on a phone and correctly wired **when it ships**. It says nothing about
whether it should ship. That is the review gate below, and no browser closes it.

Now verified in the browser:

- zero axe violations at WCAG 2.0/2.1 A and AA on the essay route, desktop and
  mobile;
- arrow, Home and End keys step both figures, and `aria-pressed` follows;
- every step control clears 44x44px at both viewports;
- the page does not scroll horizontally at 393px, and neither figure exceeds its
  column;
- each figure step links to an Atlas composition that restores, with the named
  layers actually active on arrival.

Still verified by unit test and inspection rather than in a browser, because
they are properties of the markup rather than of the rendering:

- both interactives render every step, caption and table server-side, and only
  become steppers once script runs;
- selection is weight and underline, never colour alone;
- there is no animation to disable, so reduced motion gets the identical figure;
- `EnduranceDrift` carries two captioned tables - phases with whether the ship
  was under her own power, and positions with how each was arrived at;
- evidence tables scroll rather than crush below 40rem.

### What the hold was masking

The pass was worth running for its own sake. Four defects were sitting behind
the hold, three of them on published pages:

| Found                                                                                | Where it bit                                                       |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Four unmapped native lens axes in each of `terra-incognita` and `maps-for-a-crusade` | `astro build` would have thrown on release day                     |
| `.bar-inner` never wrapped                                                           | Every essay page scrolled sideways on a phone, by 42-65px          |
| `applyDeepLink` not awaited before `renderActiveLayers()`                            | A two-layer Atlas deep link listed only the first in Active Layers |
| No `h1` on the essay                                                                 | Every heading on the page was an `h2`                              |

A held page is not a finished page kept in a drawer. It is an unrendered one,
and the checks that would have caught these were all skipping it.

## Residual risks carried while held

1. **Positions are recorded from the general literature.** Approximate, at `raw`,
   with pending locators. They are labelled as such in the data and in every
   layer record, and none may be cited.
2. **The Coronelli act is written but not releasable.** The Arctic plate, the
   _Epitome_ chapter and selected _Atlante Veneto_ pages have been read together.
   Three of seven leaves, the globe, the other atlas volumes and Milanesi remain
   open, so the explanation for the absent southern plate stays an explicitly
   medium-confidence interpretation.
3. **The Coda draws no comparison.** Neither the 1915 nor the 2022 coordinate is
   held from a source this project has read, and secondary reporting conflates
   them.
4. **The besetment date is disputed** in the sources seen: 18 or 19 January 1915.
   The dataset records 19 January and logs the disagreement.
5. **Safari has not been exercised on this host.** The current Playwright WebKit
   runtime does not support macOS 12. This is a test-environment limitation, not
   evidence of compatibility; the WebKit and mobile-Safari projects remain a
   release prerequisite on a supported runner.

## What would change the verdict

In order of leverage: read Bergman and Stuart on the Endurance position and its
chronometer companion; write to RMG Images about the verified charts; read the
remaining Coronelli leaves and Milanesi, then inspect a globe's southern calotte;
open the Wilkes atlas at the Library of Congress and find the disputed sheet;
consult Headland's chronology and check every date in the observations table
against it.
