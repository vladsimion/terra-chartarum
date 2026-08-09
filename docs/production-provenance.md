# Production provenance and live-origin verification

Terra Chartarum treats a merge/build and a verified public deployment as separate states.

## Build provenance

`npm run build` runs `npm run provenance:write` before Astro builds. This creates `public/build-info.json`, which is copied to the static site and records:

- schema version;
- deployed Git commit SHA (Cloudflare `CF_PAGES_COMMIT_SHA`, GitHub `GITHUB_SHA`, or local Git fallback);
- UTC build timestamp;
- branch and deployment URL/provider when supplied by the build environment;
- Hanseatic and geo release identifiers when available.

The file is intentionally public and contains no credentials or private metadata.

## Live-origin gate

On a successful push-to-`main` CI run, the `production-provenance` job polls the canonical origin until Cloudflare Pages serves `build-info.json` with the exact `${{ github.sha }}`.

It then verifies release-critical public assertions:

1. `/essays/the-league-that-left-no-map/` exists and contains its canonical title;
2. the essay does not expose the obsolete `Phase 0 fixture` marker;
3. `hanseatic-places.geojson`, `hanseatic-routes.geojson`, and `hanseatic-events.geojson` are publicly reachable.

A mismatch or missing assertion fails the production environment check even when the candidate build itself passed CI. This is deliberate: `Done / released` should mean the canonical origin is independently observed serving the intended commit.

## Local/manual use

```sh
npm run provenance:write
EXPECTED_GIT_SHA=$(git rev-parse HEAD) npm run production:verify
```

Override `PRODUCTION_ORIGIN`, `PRODUCTION_VERIFY_RETRIES`, or `PRODUCTION_VERIFY_DELAY_MS` for non-production diagnosis.

## Operating rule

Repository/build evidence and live-origin evidence are distinct. Jira/Confluence release reconciliation should cite the live-origin verification result for claims that a change is in production. Scholarly/data/rights acceptance gates remain independent; this control proves deployment state only.
