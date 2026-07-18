<!--
Terra Chartarum pull-request template (KAN-59 / ATLAS-702).
Delete sections that don't apply (e.g. the essay checklist for a pure code PR).
-->

## Summary

<!-- What does this PR do, and why? Link the ticket, e.g. Closes KAN-123. -->

Closes KAN-

## Type of change

- [ ] New essay (native)
- [ ] New essay (legacy embed)
- [ ] Component / island
- [ ] Platform / infrastructure
- [ ] Docs
- [ ] Fix

## Quality gates

All must pass locally and in CI before review (see `CONTRIBUTING.md`).

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run check` (types + content schema)
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run test:e2e` (Playwright + axe)

## Accessibility

- [ ] Keyboard-navigable end to end; visible focus states.
- [ ] All images/SVGs have meaningful `alt` (or are correctly marked decorative).
- [ ] Colour contrast holds against the dark canvas.
- [ ] Motion respects `prefers-reduced-motion`.
- [ ] axe reports no new violations.

## Performance

- [ ] Lighthouse ≥ 90 (all categories) on the routes this PR touches.
- [ ] Images are sized/optimised; no oversized assets committed.
- [ ] No unnecessary client JS shipped (islands stay server-rendered by default).

## Metadata & integration

- [ ] Frontmatter validates and a canonical `room` slug is set (essays).
- [ ] Cover image exists and follows the house style (essays).
- [ ] Appears correctly in the gallery, atlas timeline, and facets (essays).
- [ ] British spelling; critical-cartography voice (see the manifesto).

## Screenshots / notes

<!-- Before/after screenshots for visual changes; anything a reviewer should know. -->
