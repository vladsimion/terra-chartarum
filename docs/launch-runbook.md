# Launch runbook - Terra Chartarum

Operational checklist for taking the portal from a green `main` to a live
production deploy, and for handling the first hours after launch. Owner: whoever
is cutting the release. Keep this file in step with the actual pipeline (KAN-57 /
ATLAS-606).

## 1. Deploy topology

- **Host:** Cloudflare Pages, connected to this repository via the git integration.
  Every push to `main` triggers a production build; pull-request branches get
  preview deployments.
- **Build command:** `npm run build` (Astro static output).
- **Output directory:** `dist/`.
- **Public URL:** `https://terra-chartarum.org` - the apex, no `www` (matches
  `site` in `astro.config.mjs`, which drives canonical URLs, the sitemap and
  RSS). The origin is spelled out in five places that must stay in step:
  `astro.config.mjs`, `public/robots.txt`, `ORIGIN` in
  `scripts/validate-indexing.mjs`, `SITE` in
  `scripts/generate-publication-reports.mjs`, and the `PRODUCTION_ORIGIN`
  default in `scripts/verify-production.mjs` (plus the CI job that passes it).
- **Build alias:** `https://terra-chartarum.pages.dev` keeps resolving and keeps
  serving the same build. It is not canonical: every page carries a canonical
  `<link>` to the apex, so search engines fold it away. Preview deploys stay on
  their own `*.pages.dev` subdomains.
- **Output mode:** `output: 'static'` - no server runtime; everything ships as
  pre-rendered HTML plus client islands.

## 1a. Custom domain (terra-chartarum.org)

The domain is registered through Tucows and was delegated to Wix nameservers on
purchase. Cloudflare Pages can only attach an apex domain to a project when the
zone is on Cloudflare DNS, so the nameservers move first. Steps, in order:

1. **Add the zone.** Cloudflare dashboard -> _Add a site_ -> `terra-chartarum.org`
   -> Free plan. The scan finds nothing (the zone is empty); continue. Cloudflare
   shows two assigned nameservers, e.g. `xxx.ns.cloudflare.com` /
   `yyy.ns.cloudflare.com`.
2. **Repoint the nameservers at the registrar.** In the Wix/Tucows domain
   settings, replace `ns0.wixdns.net` and `ns1.wixdns.net` with the two
   Cloudflare nameservers from step 1. Delete nothing else. This is the only
   step outside Cloudflare, and the only one with registrar-wide effect.
3. **Wait for activation.** Cloudflare emails when the zone goes active
   (minutes to a few hours). Confirm with `dig +short NS terra-chartarum.org`.
4. **Attach the domain to the Pages project.** Pages -> the project ->
   _Custom domains_ -> _Set up a domain_ -> `terra-chartarum.org`. Cloudflare
   creates the CNAME itself and issues the certificate. Repeat for
   `www.terra-chartarum.org`.
5. **Redirect `www` to the apex.** Rules -> _Redirect Rules_ -> create:
   - When incoming requests match: _Hostname_ equals `www.terra-chartarum.org`
   - Then: _Dynamic_ redirect, expression
     `concat("https://terra-chartarum.org", http.request.uri.path)`,
     status **301**, _Preserve query string_ on.
6. **Verify.** `curl -sI https://terra-chartarum.org/` returns 200;
   `curl -sI https://www.terra-chartarum.org/` returns 301 to the apex;
   `https://terra-chartarum.org/robots.txt` names the apex sitemap.
7. **Merge the origin cutover PR** only after step 6 passes. Merging earlier
   points canonical URLs, the sitemap and RSS at a host that does not resolve,
   and `production-provenance` in CI fails the deploy.
8. **Update Plausible.** Add `terra-chartarum.org` in the Plausible site
   settings and set `PUBLIC_PLAUSIBLE_DOMAIN=terra-chartarum.org` in the
   Cloudflare Pages production environment variables. Analytics stays off until
   all three `PUBLIC_*` variables are set (see `docs/analytics-privacy.md`).

Not done, deliberately: the CND identifiers under `data/dacia/release/` and in
`scripts/dacia/build.py` still carry `terra-chartarum.pages.dev` - the `@vocab`
`.../ns/cnd#` and the dataset `@id`s `.../data/cnd-0.1` and
`.../data/cnd-1.0-rc1`. Neither resolves on the site under either domain (there
is no `/ns/` or `/data/cnd-*` route), so nothing regresses by leaving them. They
are persistent identifiers in a released graph, and rewriting a published
`@vocab` changes the meaning of every term IRI that uses it; that is a
data-versioning decision with its own ticket, not a side effect of a DNS change.

The VMN reference annotation is a different case and did move: it is served at
`/data/vmn/reference/<name>.json` by `src/pages/data/vmn/reference/[name].json.ts`,
so its `id` is a live self-locator and has to match the origin serving it.

## 2. Pre-flight gates (must be green)

Run locally, or confirm the CI run on the merge commit is green. These mirror
the CI pipeline (KAN-14):

```sh
npm run format:check   # Prettier
npm run lint           # ESLint
npm run check          # astro check (types + content schema)
npm run test           # Vitest unit tests
npm run registries:validate # shared contracts + cross-registry foreign keys
npm run build          # production build must succeed
npm run test:e2e       # Playwright e2e + axe accessibility
```

CI additionally runs Lighthouse against the built site. Do not launch on a red
pipeline.

## 3. Content & metadata checklist

- [ ] All essays build with a canonical `room` slug (the build fails on a
      missing or non-canonical slug - a green build already proves this).
- [ ] `sitemap-index.xml` is generated and reachable; `public/robots.txt`
      points at it.
- [ ] `og/` images and per-essay covers resolve (spot-check social cards).
- [ ] RSS feed (`/rss.xml`) validates and lists the expected essays.
- [ ] Search index (`/search-index.json`) loads and the search island returns
      results (essays, maps, cartographers, places).

## 3a. Staged release

Essays are published one at a time, not in bulk. Every essay carries a
`releaseAt: 'YYYY-MM-DD'` frontmatter field (schema:
`src/content/config.ts`; gate: `src/lib/release.ts`). The build includes an
essay only once that date has arrived. `'2099-01-01'` means unscheduled.

A held essay leaves no trace: no route, no sitemap entry, no RSS item, no
search document, no room listing, and no `/embed/<slug>/` payload for legacy
essays. `scripts/validate-indexing.mjs` asserts all of that after every build,
so a leak fails CI rather than reaching the site.

**The date does not publish anything by itself.** The site is static and
Cloudflare Pages builds only on a push to `main`. A release is:

```
npm run essay:release <slug>     # or --on YYYY-MM-DD to schedule
git commit -am "release: <slug>" && git push
```

Notes:

- Prose cross-references between essays must use `EssayLink.astro`
  (`<EssayLink slug="…">…</EssayLink>`), never a bare `<a href="/essays/…">`.
  It degrades to plain text while the target is held and becomes a link on the
  build after the target's date - no prose edits on release day.
- `SHOW_UNRELEASED=1 npm run dev` renders the whole collection for local
  authoring. It is never set in Cloudflare, so production and preview deploys
  both apply the gate.
- New essays scaffolded with `npm run create-essay` are born embargoed.
- If an essay's e2e coverage was skipped while it was held, re-enable it in the
  same commit that releases it.

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
  natively - a redirect would be redundant.
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
