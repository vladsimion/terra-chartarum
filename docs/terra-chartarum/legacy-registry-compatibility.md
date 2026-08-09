# Legacy registry compatibility and backfill report

This report began as the KAN-379 migration/backfill inventory and was reconciled
record by record for KAN-394 on 2026-08-09. The validator reads the original registries listed in
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

## KAN-394 legacy conformance audit

The audit applies the frozen global identifier, evidence/provenance,
lifecycle/publication and integrity contracts without treating older completed
work as if it had been blocked by contracts written later.

| Corpus / registry                     | Identifier result                                                                                                                | Evidence and lifecycle result                                                                                                                                                                    | Classification                                 | Migration or owner                                                                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Corpus Chartarum Daciae / CND         | `plc-`, `src-`, `att-`, `nmu-` and `nue-` are accepted specialist prefixes under `tc:cnd:*`; no public ID changes                | The corpus promotion ladder is stricter than the shared human-review floor. `raw`, `normalized`, `reviewed` and `approved` map without renaming; source/witness capture remains a scholarly gate | **Accepted precedent + compatible extension**  | KAN-337 owns the release/manifest boundary; KAN-334/335 own reviewed source content. Neither is a retrospective blocker on KAN-329–333 |
| Venetian Maritime Network             | Shipped bare feature IDs and uppercase source keys remain under `tc:vmn:*`; locator suffix handling stays adapter-local          | Source-key, confidence, geometry provenance and deterministic-release rules meet or exceed the shared contract. Existing phase rows coalesce to one referent for global checks                   | **Compatible extension**                       | No migration. New cross-programme exports must qualify references at the boundary                                                      |
| Hanseatic programme                   | Existing `hse-*` identifiers remain stable; `place_id` is the referent and row `id` is the dated phase                           | Promotion and rights rules are stricter than the global baseline. `unverified`/`verified` specialist states retain their names and declare their shared lifecycle meaning                        | **Compatible extension**                       | No migration. HSE validators remain authoritative for evidence sufficiency and rights promotion                                        |
| Atlas catalogue and shared registries | Existing essay, map, cartographer, bibliography, toponym and layer IDs remain under `tc:atlas:*`; no retrospective `map-` rename | Declared links validate. Free-text maker fields and missing object-standard metadata remain explicit enrichment gaps rather than invented relationships                                          | **Migration/backfill required, IDs preserved** | KAN-390 inventories every record; KAN-391/392 enrich objects; KAN-393 owns cross-link, rights and DeepZoom QA                          |

### Disposition

- **No stable public identifier is renamed.** There is therefore no alias or
  redirect table to publish in this pass.
- Dacia conventions are input to the shared contract, not completed work made
  retrospectively dependent on KAN-376–379.
- Corpus-specific lifecycle and evidence terms stay in place where they are
  stricter or more precise. The shared contract defines their interoperability
  boundary, not a mass vocabulary rewrite.
- The only bounded backfill stream found by this audit is catalogue enrichment;
  it already has owners in KAN-390–393.
- Cross-programme policy is: preserve specialist local IDs, qualify at system
  boundaries, and validate any relationship that is actually declared.

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
4. Existing specialist lifecycle fields are not mass-renamed. Their mapping is
   recorded in the KAN-394 matrix above; new manifests must keep that mapping
   explicit.
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
