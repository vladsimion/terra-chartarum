# Design

## Context

See [proposal.md](proposal.md) - Why / What Changes. Both packages are
direct `dependencies`/`devDependencies` in `package.json` (not merely
pulled in transitively), so both bumps are ordinary version-range edits,
not `overrides` entries. `maplibre-gl` has exactly one import site
(`src/components/islands/AtlasMap.astro`); `sharp` has four, only one of
which (`scripts/validate-geo-interop.mjs`) runs during `npm run build`.

## Goals / Non-Goals

**Goals:**

- Land both CVE fixes with the smallest change that keeps the Atlas map
  and the build's geo-interop check working exactly as before.
- Leave the other 19 `npm audit` findings untouched - they require a
  separate decision (whether to accept `@lhci/cli`'s downgrade path, or
  wait for an upstream fix that doesn't force one).

**Non-Goals:**

- Adopting any new v5/v6 MapLibre feature (globe, terrain, custom
  projections) - none are used today and none are needed to close the CVE.
- Re-running or re-tuning the manual image-derivative scripts
  (`build-plate-derivatives.mjs`, `build-room-images.mjs`,
  `build-og-images.mjs`) - their committed output is unaffected unless and
  until someone re-runs them.

## Decisions

**Target `maplibre-gl@^6.10.0` (latest), not the minimum CVE-fixed
`6.4.1`.** The codebase's MapLibre usage is narrow and high-level (no
custom layers, no terrain/globe/projection, no legacy expression syntax),
so the risk of the extra 6.4.1 to 6.10.0 delta is low, and pinning to the
oldest patched version would just mean re-doing this same audit sooner.
Alternative considered: pin to `6.4.1` exactly. Rejected - no evidence
found that anything between 6.4.1 and 6.10.0 reintroduces risk, and
`npm audit fix` already resolves to 6.10.0 on its own.

**Fix the dynamic-import pattern at `AtlasMap.astro:1897-1898` as part of
this change, not as a follow-up.** MapLibre v6 ships ESM-only (no
UMD/CSP bundle), which changes how a bundler resolves `import('maplibre-gl')`'s
shape; the existing `const [{ default: maplibregl }, ...] = await Promise.all(...)`
destructuring assumes a `default` export in the old shape. Concretely:
replace the destructured default with a namespace import
(`const [maplibregl, { Protocol }] = await Promise.all([import('maplibre-gl'), import('pmtiles')])`
using `import * as maplibregl` semantics, then verify at the call site
whether `maplibregl.Map`/`maplibregl.NavigationControl` resolve directly
or need one more level of `.default` - confirm against the installed
package's actual export shape once 6.10.0 is on disk, since MapLibre's
own migration notes are the authority here, not this document's guess).
Alternative considered: leave it and see if it breaks. Rejected - this is
already a confirmed break per the research pass, not a hypothetical one,
and the map is the site's central interactive feature.

**Verify via the existing functional e2e specs, not new visual-regression
tests.** No spec in this repo asserts pixel-level screenshots
(`toHaveScreenshot`/`toMatchSnapshot`), so there is no golden-image
baseline to update either way. Adding one is out of scope for a CVE-fix
change - if visual regression coverage is wanted for the Atlas map, that
is its own, separately-scoped proposal.

## Risks / Trade-offs

- **The namespace-import fix could be subtly wrong in a way tests don't
  catch** (e.g. `maplibregl.Map` resolves to `undefined` only in one
  bundler/runtime context) -> mitigation: run the full e2e Atlas suite
  listed in the proposal, not just a `tsc`/build pass, since a type-check
  can pass while the runtime import shape is still wrong.
- **WebGL2 is required by v6** (WebGL1 support dropped) -> mitigation:
  WebGL2 has been broadly supported for years across evergreen browsers;
  the e2e suite already runs in real Chromium/Firefox, which exercises
  this directly rather than requiring separate browser-support research.
- **`sharp`'s AVIF/HEIF re-tuning could make a future re-run of
  `build-plate-derivatives.mjs` produce different output at the same
  nominal quality setting** -> mitigation: not fixed by this change since
  nothing re-runs that script automatically; noted as a residual item for
  whoever next regenerates those derivatives, not a task here.
