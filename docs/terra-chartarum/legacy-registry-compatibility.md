# Legacy registry compatibility and backfill report

This is the KAN-379 migration/backfill report. The validator reads the original
registries listed in
[`data/contracts/registry-sources.json`](../../data/contracts/registry-sources.json);
it does not introduce replacement map, essay, place, source or dataset stores.

## Compatibility matrix

| Registry group                                                          | Decision                                                                                      | Current result                                                                                                                              |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Atlas essays, maps, cartographers, bibliography, toponyms and layers    | Preserve local IDs; qualify only across registries                                            | Compatible. Existing Zod-backed sources remain authoritative.                                                                               |
| Geo release catalogue                                                   | Treat asset IDs as dataset IDs and require each to resolve to a registered layer              | Compatible. Asset-to-layer joins are build-validated.                                                                                       |
| VMN ports, routes, territories, sources and Atlas links                 | Preserve shipped bare IDs under `vmn`; strip only locator suffixes when resolving source keys | Compatible extension. Repeated port/territory phase rows coalesce to one canonical referent; Atlas target type selects the target registry. |
| HSE places, dated phases, routes, events, sources, claims and witnesses | Preserve `hse-*`; distinguish stable `place_id` from dated row `id`                           | Compatible extension. Existing promotion rules remain stricter.                                                                             |
| CND places, sources, attestations and name-use graph                    | Preserve the frozen local prefixes under `cnd`                                                | Compatible extension. No CCD/CND file is migrated by KAN-379.                                                                               |

## Backfill still required

These are compatibility gaps, not reasons to rewrite valid published IDs:

1. Existing public fragments and intra-registry CSV joins remain local IDs. A
   cross-programme export or Confluence record must add the qualified
   `tc:{authority}:{family}:{localId}` reference at its boundary.
2. Legacy map records may carry a free-text `cartographer` without declaring
   `cartographerId`. The relation remains optional; when an ID is declared it is
   validated. KAN-394 owns any scholarly identity backfill.
3. Optional essay/map/place/source links are not invented. Missing optional
   links are reported as potential orphans only for registries that opt into the
   warning; broken links that are present are errors.
4. Existing specialist lifecycle fields are not mass-renamed. New manifests
   must declare their mapping to the shared lifecycle; KAN-394 owns legacy
   record-by-record reconciliation.
5. The global validator proves IDs and references. Evidence sufficiency, rights
   and promotion remain enforced by the Dacia, VMN and HSE validators until a
   specialist table explicitly adopts the shared machine vocabulary.

The optional CND name-use adapters activate when those KAN-336 tables exist;
KAN-379 does not make its own deployment depend on that separately owned work.

## Build behavior

`npm run registries:validate` fails on duplicate local or qualified IDs, missing
required foreign keys, unresolved declared optional links and malformed shared
contracts. It prints the registry, source row, field, bad value and expected
target registry. Orphan findings are warnings and never force optional
relationships into existence.

The command runs directly in CI and at the start of `npm run build`, so drift is
reported before Astro renders a page.
