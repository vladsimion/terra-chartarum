# Proposal

## Why

`npm audit` reports 21 remaining vulnerabilities after the last safe
(non-breaking) fix pass, and two of them are severe enough to act on
directly: a **critical** MapLibre GL JS XSS sanitizer bypass
(GHSA-jrc7-96c5-q579, fixed in 6.4.1) that lets a second consecutive
dangerous attribute survive attribute removal during the attribution
control's HTML insertion (a zero-click XSS path for anyone who can
influence attribution/marker HTML), and **high**-severity `sharp`
vulnerabilities inherited from libvips (CVE-2026-33327/33328/35590/35591)
and libheif (GHSA-g89c-p67h-r497, GHSA-2jg2-4ch7-h545), fixed in `sharp`
0.35.4. `npm audit fix --force` bundles these with unrelated major bumps
(Astro, vitest) and a downgrade of `@lhci/cli`, and fails outright on an
internal npm bug - so these two need their own deliberate, scoped upgrade
instead.

## What Changes

- Bump `maplibre-gl` from `^4.7.1` to `^6.10.0` (the CVE fix landed at
  6.4.1; 6.10.0 is current `latest` and what `npm audit fix` already
  targets). Fix the one confirmed break: the dynamic-import destructuring
  in `src/components/islands/AtlasMap.astro:1897-1898`
  (`const [{ default: maplibregl }, ...] = await Promise.all([import('maplibre-gl'), ...])`)
  relies on a default export that v6's ESM-only distribution (UMD/CSP
  bundle dropped) does not provide the same way - needs a namespace or
  named import instead.
- Bump `sharp` from `^0.33.5` to `^0.35.4`. No code changes are expected:
  the only sharp call site that runs during `npm run build`
  (`scripts/validate-geo-interop.mjs`) only calls `.metadata()`, which is
  unaffected by the v0.35 AVIF/HEIF encoder re-tuning. Node ≥20.9.0 is
  already satisfied (this repo pins Node 22 via `.node-version`).
- Verify both bumps by running the Playwright specs that exercise the live
  map (`e2e/vmn-visual.spec.ts`, `e2e/atlas-layer-browser.spec.ts`,
  `e2e/dacia-atlas-facets.spec.ts`, `e2e/atlas-handbook.spec.ts`,
  `e2e/atlas-cutover-regression.spec.ts`), since none of them assert
  pixel-level screenshots (no `toHaveScreenshot`/`toMatchSnapshot` in
  `e2e/`), so a functional pass is the available verification, not a
  golden-image diff.

Non-goals: this change does not address the other 19 remaining `npm audit`
findings (the `@lhci/cli`-nested `tmp`/`uuid`/`@puppeteer/browsers` issues,
and the unrelated Astro/Cloudflare-adapter/vitest major-version
cascade) - those stay out of scope for a later, separately-scoped pass.
It also does not regenerate the AVIF/WebP/PNG image derivatives that
`scripts/build-plate-derivatives.mjs`, `build-room-images.mjs`, and
`build-og-images.mjs` produce - those are manual, already-committed
outputs, unaffected by this bump unless someone re-runs those scripts
later (flagged as a residual note, not a task here).

## Capabilities

### New Capabilities

_(none - see .openspec.yaml `skip_specs: true`)_

### Modified Capabilities

_(none - this is a dependency-version bump plus one internal import-syntax
fix; no externally observable behavior is intended to change)_

## Impact

- `package.json` / `package-lock.json` - `maplibre-gl` and `sharp` version
  bumps.
- `src/components/islands/AtlasMap.astro` - one import-statement fix (the
  dynamic-import destructuring at line ~1897).
- No other source file imports either package directly (confirmed: only
  `AtlasMap.astro` imports `maplibre-gl`; only
  `scripts/build-plate-derivatives.mjs`, `scripts/build-room-images.mjs`,
  `scripts/build-og-images.mjs`, and `scripts/validate-geo-interop.mjs`
  import `sharp`, and only the last of those runs during `npm run build`).
