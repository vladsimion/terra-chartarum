# Editorial cohesion audit — 29 July 2026

Scope: the four recently published native editorial packages and the Wave 3
candidate register. There is no built Wave 2 or Wave 3 draft currently in flight;
candidate briefs are therefore reviewed for structural readiness, not prose.

## Findings

| Essay                      | Outline  | Narrative           | Cohesion finding                                                                                                                          | Required correction                                                                                                                         |
| -------------------------- | -------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Invisible Maps of Trade    | Approved | Approved with notes | The portolan/authority-table contrast holds through the six-part sequence, and the port beats keep technical data attached to the thesis. | During the next copy pass, trim repeated formulations of “the chart does not show” where adjacent sections make the same transition.        |
| Maps That Age              | Approved | Approved with notes | The state-ledger method and comparison island make revision—not mere antiquity—the continuous argument.                                   | Retain the early plain-language definition of a plate “state”; catalogue terminology must not precede it in future revisions.               |
| Invisible Maps of Religion | Approved | Approved with notes | Centring, orientation, itinerary, and sacred city form a clear movement from cosmology to embodied practice.                              | Keep map inventories subordinate to the embodied through-line; any added object needs an explicit section-level claim.                      |
| Cities Remember            | Approved | Approved with notes | Fragment, view, wall, public ground, risk, and overlay form the strongest chapter-to-chapter causal sequence in the set.                  | The title-bearing hero is decorative and must remain `alt=""`; future copy edits should avoid repeating its title before the semantic `h1`. |

## Cross-essay drift patterns

1. Openings consistently frame maps as arguments, but the negative formula
   “does not merely show” recurs often. Future drafts should vary the rhetorical
   hinge while preserving the critical-cartography stance.
2. Evidence density is strongest when an island performs the chapter’s claim.
   Catalogue lists without a named interpretive job are a cohesion risk.
3. Room and related-essay links work best at conceptual hand-offs. Front-loaded
   link clusters are useful orientation, but should not replace transitions in
   the body.
4. Technical vocabulary is unevenly staged. State, fondaco, ichnography, and
   orientation need a plain-language first use before specialist distinctions.

## Wave 3 readiness

All twelve candidates have one primary room, no more than two secondary rooms,
an Editorial owner, a unique Jira issue, and an assigned interactive direction.
Before any candidate advances from outline to draft, use
[`review-template.md`](review-template.md) and record both review decisions in its
package manifest.

## Disposition

No published essay is blocked or requires rollback. The four copy-level notes
above are non-blocking maintenance guidance. The mandatory manifest review gate
prevents future packages from reaching Build, Design QA, or Publish without
recorded outline and narrative decisions.
