# Definition of done — a new essay

An essay is **done** when every box below is checked. This is the shared quality
bar for merging any new essay into Terra Chartarum; the pull-request template
restates the same gates. Reviewers should treat an unchecked box as a blocker,
not a nicety.

## Builds & validates

- [ ] Frontmatter validates (`npm run check`) with a canonical `room` slug.
- [ ] `npm run build` succeeds and the essay renders at `/essays/<slug>/`.
- [ ] All quality gates pass in CI: Prettier, ESLint, astro check, Vitest,
      build, Playwright + axe, Lighthouse.

## Content & voice

- [ ] The essay makes a critical-cartography argument — it reads maps as
      arguments, not neutral windows (see the manifesto).
- [ ] British spelling throughout; em-dash-friendly, academic-but-intimate
      register consistent with the family.
- [ ] Sources are credited; any claims that need support are referenced.
- [ ] Summary/subtitle work as the card and social (OG) hook.

## Accessibility

- [ ] Keyboard-navigable end to end, with visible focus states.
- [ ] Every image/SVG has meaningful `alt`, or is correctly marked decorative.
- [ ] Colour contrast holds against the dark canvas.
- [ ] All motion respects `prefers-reduced-motion`.
- [ ] axe reports no new violations.

## Performance

- [ ] Lighthouse ≥ 90 in all categories on the essay route.
- [ ] Images are sized and optimised; no oversized assets committed.
- [ ] Interactive islands stay server-rendered by default; client JS is minimal
      and only shipped where interaction requires it.

## Design & integration

- [ ] Uses the shared [design tokens](design-tokens.md) rather than hard-coded
      colours, sizes, or durations.
- [ ] Cover art exists and follows the house style (dark canvas, one accent,
      humanist serif title).
- [ ] Metadata (eras, regions, lenses, room, year range) is accurate, and the
      essay appears correctly in the gallery, atlas timeline, and facets.
- [ ] Cross-links to related essays/rooms are in place where relevant.
