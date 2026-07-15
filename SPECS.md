# Terra Chartarum — Specification

An interactive historical-atlas portal: a gallery of cartographic visual essays
under one publication of record. Cohesion lives in the **shell, tokens,
navigation, motion, and metadata** — each essay keeps its bespoke interior.

- **Status:** M1 (Portal MVP) scaffold complete — 4 legacy essays live under one
  roof with shared chrome.
- **Stack:** Astro (static output, islands) + TypeScript (strict) + Tailwind +
  CSS custom-property tokens + Astro Content Collections (Zod).
- **Full roadmap & backlog:** `jira-import.csv` (project key `ATLAS`).

---

## 1. Architecture

- **Astro, HTML-first, static output.** `astro build` emits a portable `dist/`
  that runs from any static host (`npx serve dist`). Islands architecture ships
  ~zero JS except explicitly hydrated widgets.
- **Shell wraps bespoke interiors.** A unified portal chrome (header/footer/nav,
  tokens, transitions) frames each essay. Interiors are untouched.
- **Legacy essays via iframe isolation.** The four source essays are large
  self-contained HTML documents with global inline CSS/JS. Each is preserved
  verbatim under `public/embed/<slug>/` and hosted inside an `<iframe>` on its
  wrapper route. This is the zero-risk boundary (essays assume top-level
  `document`) and prevents global-CSS collision with the shell.

### Route → asset separation (important)
The wrapper route `/essays/<slug>/` and the raw essay must **not** share an
output path. Raw essays therefore live at `/embed/<slug>/`, and each wrapper's
iframe points at `/embed/<slug>/index.html`. Do not move raw essays back under
`public/essays/` — the wrapper would recursively load itself.

### Directory layout (as built)
```
src/
  pages/
    index.astro            # Atlas landing (hero + featured + stats)
    essays/index.astro     # Gallery with search + era/region/lens facets
    essays/[slug].astro    # Essay host route (chrome + iframe interior)
    atlas.astro            # Cross-essay sqrt-compressed timeline
    colophon.astro         # Meta-lens crosswalk + token style guide
    about.astro
    404.astro
  layouts/PortalLayout.astro     # Shell chrome; `bare` prop drops header/footer
  components/Header.astro Footer.astro EssayCard.astro
  content/
    config.ts              # CANONICAL_DIMENSIONS + Zod essay collection schema
    essays/*.md            # Frontmatter registry entries (status: legacy)
  lib/registry.ts          # DIMENSION_META, CROSSWALK, getEssays(), facets...
  styles/tokens.css global.css
public/
  embed/<slug>/            # Legacy essays preserved verbatim
  covers/*.svg favicon.svg
astro.config.mjs tailwind.config.mjs tsconfig.json
```

---

## 2. Design System & Tokens

`src/styles/tokens.css` is the single source of truth; `tailwind.config.mjs`
maps Tailwind utilities onto the same CSS variables. `/colophon` renders them.

- **Canvas/ink:** `--canvas:#0a0806`, `--panel`, `--ink:#e8dec5`,
  `--ink-muted`, `--gold:#d4b87a`.
- **Semantic:** `--gained:#96cc84`, `--sacrificed:#d98860` (radar/delta viz).
- **Type:** display = Cinzel / IM Fell English; body = Crimson Pro / EB Garamond;
  mono = IBM Plex Mono. Fluid modular scale `--step--1` … `--step-5`.
- **Motion:** shared easing/duration tokens; all motion honors
  `prefers-reduced-motion`.
- **Per-essay accent:** each essay carries an `accent` hex used by its card and
  chrome, so interiors stay distinct within one family.

---

## 3. Content Model

Essays are Astro Content Collection entries (`src/content/essays/*.md`),
Zod-validated in `src/content/config.ts`. Legacy essays carry `status: legacy`
and an `embedPath`; native essays (future) will carry MDX bodies.

```ts
interface Essay {
  title: string; subtitle: string; summary: string;
  cover: string;                       // /covers/<slug>.svg
  status: 'legacy' | 'native';
  embedPath?: string;                  // /embed/<slug>/index.html (legacy)
  eras: string[]; regions: string[]; lenses: string[];
  yearFrom: number; yearTo: number;
  mapCount?: number; readingMinutes?: number;
  accent: string; order: number; featured?: boolean;
  publishedAt: string; updatedAt: string;
  metaScores?: Partial<Record<CanonicalDimension, number>>;  // 0–1
}
type CanonicalDimension =
  'measure' | 'witness' | 'use' | 'cosmos' | 'power' | 'silence';
```

`src/lib/registry.ts` reads the collection and exposes `getEssays()`,
`getFeaturedEssays()`, `getFacets()`, `formatYear()`, `yearRange()`, plus
`DIMENSION_META` and the `CROSSWALK`.

---

## 4. Harmonized Meta-Lens (additive)

The four essays use different analytical vocabularies. They are harmonized into
**one overarching lens of 6 canonical dimensions** — *derived from*, not imposed
on, the essays (all four share a Harley critical-cartography spine where Power
and Silence are first-class).

**Design rule: additive, never replacing.** Each essay keeps its native lens
intact inside the interior. The meta-lens lives only at the **portal level**
(faceted discovery, tagging, optional cross-essay radar) and is documented
transparently in `/colophon` as *one interpretive frame* — on-theme, since every
map has its own silences.

| Canonical | Meaning | cartography | Speculum | Dacia | Venice·Sicily |
|-----------|---------|-------------|----------|-------|---------------|
| **Measure** | geometric/survey fidelity | Accuracy | Geodesy | mensvra | MARE/TERRA detail |
| **Witness** | empirical grounding vs copied | (Completeness) | Witness | — | — |
| **Use** | navigation, fitness, reach | Usability, Navigation | Fitness, Reach | — | RETE |
| **Cosmos** | symbolic/meaning density, naming, craft | Symbolism, Richness | Cosmos, Hand | nomina, ordinatio, litterae | — |
| **Power** | politics, authority, boundaries | Politics | — | auctoritas, limes | CONFINE, IMPOSIZIONE, CIRCOLAZIONE |
| **Silence** | omission, erasure, exclusion | (Completeness, inverse) | — | silentium, rasura, vacat | Harley "what omitted" |

- The machine-readable `CROSSWALK` in `registry.ts` maps each native axis to
  canonical dimensions (e.g. `Accuracy: {measure:1}`,
  `Completeness: {witness:0.5, silence:-0.5}`, `silentium: {silence:1}`).
- Dacia's **Sex Lectiones** is a *reading method*, not a scoring set — only
  `rasura`/`vacat` feed Silence; the rest stays a reading protocol.
- **Normalization:** native scales (1–5, 0–8, categorical) normalize to 0–1 for
  any cross-essay radar, with the commensurability caveat stated inline.
- **Scope:** crosswalk + faceting ship first; a fully normalized cross-essay
  radar (re-scoring maps) is deferred (ATLAS-EL4).

---

## 5. Interactive Atlas & Geo Tier (future)

- **Atlas meta-layer (E5):** MapLibre GL map (pins → essays/maps) + unified
  corpus timeline + faceted discovery + client search. The current
  `atlas.astro` ships the timeline (sqrt-compressed for ancient eras,
  `pos = (1 − sqrt((NOW − year) / ageMax)) × 100`, `NOW = 2024`).
- **Geo-data tier (EG) — Regime A first:** serverless cloud-native GIS with no
  database — **PMTiles** (vector/raster via HTTP range requests), **COG**
  (raster), **FlatGeobuf/GeoJSON** (small vectors), served from CDN. A typed
  `GeoLayer` registry mirrors the essay registry (kind, format, url, crs,
  temporal extent, source/license/attribution, `essaySlugs`).
- **Escalation to Regime B (deferred):** stand up PostGIS + Martin/TiTiler only
  on a real trigger — spatial queries, very large data, dynamic tiling, or
  user-contributed data.
- **Georeferencing (optional, ATLAS-EG6):** warp scanned maps via Allmaps/IIIF;
  OpenLayers where projections require it.

---

## 6. Authoring a New Essay (native)

1. Add `src/content/essays/<slug>.mdx` with valid frontmatter (schema in
   `src/content/config.ts`), `status: native`.
2. Add `/covers/<slug>.svg` and set `accent`.
3. Compose the body with shared islands (RadarChart, AdaptiveTimeline,
   CompareSlider, Scrollytelling — extracted in E4).
4. Add `metaScores` for cross-essay discovery (optional; see §4).
5. `npm run build` — the gallery, atlas timeline, and facets pick it up
   automatically from the registry.

A documented `starter/` kit + `create-essay` scaffold script land in ATLAS-406.

---

## 7. Development

```bash
npm install --cache ./.npm-cache --no-audit --no-fund   # sandbox-safe cache
npm run dev        # http://localhost:4321
npm run build      # -> dist/ (portable static)
npm run preview    # serve the build
npm run check      # astro check (types)
```

### Known state / deferrals
- **Sitemap** (`@astrojs/sitemap`) is removed pending a version-compatible pin —
  it crashed the build at `build:done`. Re-add under **ATLAS-205** with RSS +
  `robots.txt`.
- **Production origin** in `astro.config.mjs` (`site`) is a placeholder — set the
  real origin under **ATLAS-605** before launch.
- **Tooling/CI** (ESLint, Prettier, Vitest, Playwright, axe, Lighthouse CI) is
  scoped in **ATLAS-102**, not yet wired.

---

## 8. Verification

- **Local:** `npm run dev`; each legacy essay renders pixel-faithfully vs. its
  source (side-by-side). All routes return 200; wrapper iframe resolves to
  `/embed/<slug>/index.html`; raw embed serves the full document.
- **Automated (E6):** Vitest (components), Playwright (atlas→essay→back, filters,
  search), axe (a11y), Lighthouse CI (perf budgets) in CI.
- **Regression guard:** visual snapshot of each legacy essay to catch
  isolation-boundary style leakage.

---

## 9. Milestones

- **M1 — Portal MVP:** E1 + E2 + E3 (+ EL1–EL3) → unified site, all 4 essays
  live. *(scaffold complete)*
- **M2 — Platform:** + E4 → shared components + new-essay starter.
- **M3 — Atlas:** + E5 + EG + EL4 → cross-essay map/timeline/lens/GIS discovery.
- **M4 — Launch:** + E6 → production deploy; E7 runs continuously after.
