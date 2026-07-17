# Launch runbook — Terra Chartarum

Operational checklist for taking the portal from a green `main` to a live
production deploy, and for handling the first hours after launch. Owner: whoever
is cutting the release. Keep this file in step with the actual pipeline (KAN-57 /
ATLAS-606).

## 1. Deploy topology

- **Host:** Cloudflare Pages, connected to this repository via the git
  integration. Every push to `main` triggers a production build; pull-request
  branches get preview deployments.
- **Build command:** `npm run build` (Astro static output).
- **Output directory:** `dist/`.
- **Public URL:** `https://terra-chartarum.pages.dev` (matches `site` in
  `astro.config.mjs`, which drives canonical URLs, the sitemap and RSS).
- **Output mode:** `output: 'static'` — there is no server runtime. Everything
  ships as pre-rendered HTML plus client islands.

## 2. Pre-flight gates (must be green)

Run locally, or confirm the CI run on the merge commit is green. These mirror
the CI pipeline (KAN-14):

```sh
npm run format:check   # Prettier
npm run lint           # ESLint
npm run check          # astro check (types + content schema)
npm run test           # Vitest unit tests
npm run build          # production build must succeed
npm run test:e2e       # Playwright e2e + axe accessibility
```

CI additionally runs Lighthouse against the built site. Do not launch on a red
pipeline.

## 3. Content & metadata checklist

- [ ] All essays build with a canonical `room` slug (the build fails on a
      missing or non-canonical slug — a green build already proves this).
- [ ] `sitemap-index.xml` is generated and reachable; `public/robots.txt`
      points at it.
- [ ] `og/` images and per-essay covers resolve (spot-check social cards).
- [ ] RSS feed (`/rss.xml`) validates and lists the expected essays.
- [ ] Search index (`/search-index.json`) loads and the search island returns
      results (essays, maps, cartographers, places).

## 4. Error pages

- [ ] `/404` renders the branded "Off the edge of the map" page. Cloudflare
      Pages serves `404.html` automatically for unmatched routes.
- [ ] `/500` renders the branded "A fault in the survey" page. With static
      output there is no server runtime to throw 5xx on our own paths; the page
      exists so a platform-level 5xx or a manually wired error response stays on
      brand.

## 5. Redirects

No `_redirects` file ships, and none is required for launch:

- The essays are a fresh portal; there is **no external legacy URL scheme** to
  map. The essays were preserved from their original sources, but those sources
  were separate deployments whose URLs we do not control from here.
- The one historical note (`src/content/config.ts`) mentions an old
  `/essays/<slug>/index.html` embed convention. Astro already emits each essay
  at `/essays/<slug>/` (i.e. `/essays/<slug>/index.html`), so that path resolves
  natively — a redirect would be redundant.
- **Do not** add a redirect for anything under `/embed/`. Every legacy essay
  iframes its preserved HTML directly from `/embed/<slug>/index.html`;
  redirecting that path would break the embeds.

If a genuine old URL surfaces post-launch, add a Cloudflare `_redirects` file to
`public/` with `301` rules and re-run the pipeline.

## 6. Launch steps

1. Confirm `main` is green (section 2) and the desired commit is the latest.
2. Watch the Cloudflare Pages production deploy for the merge commit reach
   "Success".
3. Smoke-test production:
   - Home, `/rooms/`, each of the seven room pages, `/essays/` and one essay of
     each `status` (legacy embed + native), `/atlas/`, `/collection/`,
     `/cartographers/`, `/bibliography/`, `/about/`, `/colophon/`.
   - Trigger a 404 (visit a nonsense path) and confirm the branded page.
   - Open search (Cmd/Ctrl-K), run a query, apply the room/type facets.
4. Verify canonical `<link>`, OG tags and the sitemap point at the production
   host, not a preview URL.

## 7. Rollback

Cloudflare Pages keeps every deployment. To roll back, promote the last known
good deployment from the Pages dashboard ("Rollback to this deployment"). No git
revert is needed for an immediate mitigation; follow up with a revert PR on
`main` so the tree matches production.

## 8. Post-launch watch

- Check the Pages analytics / deploy log for build or asset errors.
- Re-run Lighthouse against production and compare against the CI budget.
- Keep an eye on 404s in the first day; recurring ones may reveal a real old URL
  worth a redirect (section 5).
