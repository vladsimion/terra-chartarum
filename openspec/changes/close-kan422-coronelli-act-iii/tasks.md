# Tasks

## 1. Read the remaining Atlante Veneto polar-section leaves

- [ ] 1.1 Read Rumsey 12186.102 (printed page 71) and add its content and
      bearing on the central claim to `docs/antarctica/coronelli-act-iii.md`;
      verify by confirming a corresponding reading-status row exists in
      `coronelli-annotations.csv`
- [ ] 1.2 Read Rumsey 12186.103 (printed page 72), same treatment and
      verification as 1.1
- [ ] 1.3 Read Rumsey 12186.106 (printed pages 74–75), same treatment and
      verification as 1.1
- [ ] 1.4 Update the "three of seven leaves read" caveat in
      `docs/antarctica/coronelli-act-iii.md` and
      `docs/antarctica/release-readiness.md` risk #2 to the new count;
      verify with `grep -r "three of seven\|3 of 7" docs/antarctica/`
      returning no stale matches

## 2. Audit the wider Atlante Veneto and the Libro dei Globi

- [ ] 2.1 Add an `audit_result` column (`content_found` / `none_found`) to
      `coronelli-annotations.csv`; verify `src/lib/corpus.ts` validation and
      the Antarctic rule/build test suite still pass against the new schema
- [ ] 2.2 Audit each of the other twelve _Atlante Veneto_ volumes for
      southern-polar content and record one `audit_result` row per volume;
      verify every volume has exactly one row (no volume left absent from
      the table)
- [ ] 2.3 Audit the _Libro dei Globi_ the same way and record its
      `audit_result` row; verify as in 2.2

## 3. Consult Milanesi

- [ ] 3.1 Read Milanesi on Coronelli for what Pepoli's patronage and the
      Frari workshop's practice mean for reading `Terre Artiche`/
      `Polo Artiche`; add a cited source row to `sources.csv`
- [ ] 3.2 Link the new Milanesi source to every `coronelli-lineage.csv` claim
      it bears on; verify each linked claim's source reference resolves to
      the new `sources.csv` row

## 4. Examine the globe's southern calotte

- [ ] 4.1 Locate a catalogued Coronelli gore set (c.1688) and confirm
      whether it is accessible for examination (rights/scan availability);
      record the access finding either way in `sources.csv`
- [ ] 4.2 If accessible: examine the southern calotte, classify its content
      under the programme's five evidence categories (conjectured, reported,
      observed, surveyed-reconciled, disproved), and add the object to
      `map-objects.csv` with rights and scan-source metadata; verify
      `src/lib/corpus.ts` validation accepts the new row
- [ ] 4.3 If not accessible: record the access constraint as an explicit
      finding (not a silent gap), noting what would need to change for
      future access; verify the finding is discoverable from
      `docs/antarctica/coronelli-act-iii.md`'s "What is not established"
      section

## 5. Resolve the Act III annotation plan

- [ ] 5.1 Fix the IIIF column coordinates for printed page 76 in
      `coronelli-annotations.csv`; verify the region resolves against
      `RUMSEY~8~1~303154~90060722` at the stated image dimensions
      (12365 x 7744)
- [ ] 5.2 If task 4.2 completed: add a DeepZoom target for the globe's
      southern calotte, accounting for the same gutter-fold constraint
      already noted against the plate's central legend; verify the target
      is recorded in `coronelli-annotations.csv`
- [ ] 5.3 Verify no remaining entry in `coronelli-annotations.csv` is marked
      as an unresolved region (grep for the existing "unresolved" marker)

## 6. Update documentation and validate

- [ ] 6.1 Revise `docs/antarctica/coronelli-act-iii.md`'s "What is not
      established" section to reflect what this change closed and what (if
      anything from task 4.3) remains open
- [ ] 6.2 Revise `docs/antarctica/release-readiness.md` risk #2 to describe
      the new state accurately; verify the risk text no longer contradicts
      the corpus (e.g. does not still say "three of seven" if 1.4 closed it)
- [ ] 6.3 Run the Antarctic rule/build test suite and the full Vitest suite;
      verify all pass and the release build remains byte-identical/manifest
      hash-verified as described in `docs/antarctica/release-readiness.md`
