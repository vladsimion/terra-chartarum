# Nomen Errans release evidence

Released on 2026-08-26 under KAN-347, after the KAN-344 evidence and rights
package closed. The production route is `/essays/nomen-errans/` and the programme
entry `ccd-c` is live.

## Shared CND path

_Nomen Errans_ has no private dates, coordinates or public-review decisions. Its
production path is:

1. `data/dacia/name-uses.csv`, `sources.csv` and `name-use-edges.csv` hold the
   canonical records.
2. `data/dacia/reference/nomen-errans-atlas-states.csv` records the honest Atlas
   route or the reason there is none.
3. `make dacia` compiles those tables into
   `src/data/dacia/generated/nomen-errans.json`.
4. `src/lib/nomen-errans.ts`, `NameCareers.astro` and `NameMigration.astro` read
   that generated slice.
5. The programme graph counts all ten CND name-use records against Trench C, so
   Campaign I can verify the consumer from generated data rather than from this
   narrative.

The compiler exposes only rows at `reviewed` or above. Seven reviewed uses form
the public career sequence and three normalized uses are counted but withheld.
All eleven relationship rows have since passed human review (KAN-344): eight of
the ten Dacia edges are drawn, and the remaining two are withheld because each
lands on a use that is still `normalized`. A reviewed edge is not by itself
permission to draw a line.

## Evidence and rights boundary

The published argument uses the reviewed `applicatio`, `translatio` and
`restitutio` examples. It does not publish the normalized `inventio` reading.
The scan of Decree 194/1974 is the sole production witness, source-checked under
PD-RO-exempt / no known restrictions. Five uncleared candidates remain
`research_only` and are not reproduced.

## Release verification

- `python3 scripts/dacia/validate.py`: passed.
- `.venv/bin/python -m pytest scripts/dacia -q`: 194 passed.
- `npm test`: 632 passed, including 13 Nomen Errans and 6 programme-index tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run check`: zero errors.
- `npm run build`: passed after the complete six-gate matrix closed; 155 static
  pages built and the reporting, indexing, geo-interoperability and handbook
  checks all passed.
- Production route, search, sitemap and Atlas restore: 4 Playwright checks
  passed on Chromium.
- The complete desktop/Pixel 5 matrix has 50 passing checks. In the final
  four-worker run, 46 passed and four desktop checks timed out while concurrent
  whole-page axe scans held the browser; those four then passed on one worker in
  7.0 seconds. Keyboard, touch targets, axe WCAG A/AA, reduced motion, layout and
  the Atlas round trip all have a passing result.

CI remains the cross-browser and Lighthouse authority before merge.

## Residual boundary

The three normalized rows are ready for a named reviewer, but release does not
depend on promoting them: none contributes a public career or material essay
claim. A later promotion can expand the sequence through the ordinary compiler;
it must not be made by editing the essay.
