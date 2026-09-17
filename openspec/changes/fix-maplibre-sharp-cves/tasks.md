# Tasks

## 1. Upgrade sharp

- [ ] 1.1 Bump `sharp` to `^0.35.4` in `package.json` and run `npm install`;
      verify `node_modules/sharp/package.json` reports `0.35.4` and
      `npm audit` no longer lists the libvips/libheif CVEs for `sharp`
- [ ] 1.2 Run `npm run build`; verify `geo:interop:validate` still passes
      (it only calls `.metadata()`, so no code change is expected here)
- [ ] 1.3 Run `npx vitest run`; verify all existing tests still pass

## 2. Upgrade maplibre-gl and fix the import break

- [ ] 2.1 Bump `maplibre-gl` to `^6.10.0` in `package.json` and run
      `npm install`; verify `node_modules/maplibre-gl/package.json`
      reports `6.10.0` and `npm audit` no longer lists
      GHSA-jrc7-96c5-q579
- [ ] 2.2 Fix the dynamic import at `src/components/islands/AtlasMap.astro`
      (currently `const [{ default: maplibregl }, { Protocol }] = await Promise.all([import('maplibre-gl'), import('pmtiles')])`)
      to match v6's actual ESM export shape; verify `npm run check`
      (astro/tsc) reports no new type errors on this file
- [ ] 2.3 Run `npm run dev` (or an equivalent local preview) and manually
      load the Atlas map; verify the map renders, a layer can be toggled,
      and a marker popup opens - confirming `maplibregl.Map`,
      `NavigationControl`, `Popup`, and `Marker` all resolve correctly at
      runtime, not just at the type level

## 3. Verify end-to-end

- [ ] 3.1 Run `e2e/vmn-visual.spec.ts`, `e2e/atlas-layer-browser.spec.ts`,
      `e2e/dacia-atlas-facets.spec.ts`, `e2e/atlas-handbook.spec.ts`, and
      `e2e/atlas-cutover-regression.spec.ts`; verify all pass (chromium at
      minimum, per this project's known WebKit-on-macOS-12 limitation)
- [ ] 3.2 Run the full `npm run build` pipeline (all validators plus the
      Astro build); verify it completes with no new failures
- [ ] 3.3 Run `npm audit`; verify the count has dropped by the two CVEs
      this change targets (GHSA-jrc7-96c5-q579 and the `sharp`
      libvips/libheif findings), and confirm no new vulnerabilities were
      introduced by the bump itself
