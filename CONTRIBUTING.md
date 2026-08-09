# Contributing to Terra Chartarum

Terra Chartarum is a portal for reading maps critically - a growing family of
interactive visual essays under one roof. This guide is the **end-to-end path**
for adding an essay or otherwise contributing code, from a clean checkout to a
merged, launch-ready pull request.

New here? Read the [manifesto](https://terra-chartarum.pages.dev/about/) and
`SPECS.md` first - they explain the seven-room cosmography and the editorial
voice every essay shares.

## Prerequisites

- Node 20+ and npm.
- A clone of this repository. Install dependencies with `npm install`.

```bash
npm run dev        # local dev server at http://localhost:4321
```

## Repository map

| Path                      | What lives there                                      |
| ------------------------- | ----------------------------------------------------- |
| `src/content/essays/`     | Essay content (MDX = native, `.md` + embed = legacy). |
| `src/content/config.ts`   | Zod schema that validates every essay's frontmatter.  |
| `src/components/islands/` | Reusable interactive components (radar, timeline, …). |
| `src/lib/`                | Registries + pure helpers (unit-tested, `*.test.ts`). |
| `src/styles/tokens.css`   | The shared [design tokens](docs/design-tokens.md).    |
| `src/data/rooms.ts`       | The seven-room cosmography (single source of truth).  |
| `starter/`                | The essay starter kit + template.                     |
| `public/embed/<slug>/`    | Preserved HTML for legacy essays (iframed).           |
| `docs/`                   | Contributor docs, design reference, launch runbook.   |
| `e2e/`                    | Playwright end-to-end + accessibility specs.          |
| `media-src/`              | Gitignored full-resolution masters (see below).       |

### Image masters

Photographic masters are too heavy to commit - the seven room plates alone are
39 MB - so `media-src/` is gitignored and only the optimised derivatives under
`public/` are tracked. `scripts/build-room-images.mjs` and
`scripts/build-og-images.mjs` generate those derivatives once and they are
committed, exactly because a fresh clone has no masters to build from.

The masters are therefore **not** recoverable from git. The room plates are
backed up in iCloud Drive at
`Documents/Terra Chartarum/media-masters/rooms/`; restore them to
`media-src/rooms/` before running `npm run build-room-images`.

The same script also derives the `cover`/`hero` pair for any non-anchor essay
that carries a photographic plate rather than a generated SVG cover - see
`ESSAY_PLATES` in the script, which maps an essay slug to its untitled and
titled masters and writes into `public/images/<slug>/`.

## Adding a native essay

The full authoring walkthrough - scaffold, frontmatter reference, and the island
library - lives in [`starter/README.md`](starter/README.md). In brief:

```bash
npm run create-essay -- --slug my-essay --title "My Essay Title"
```

1. Edit the frontmatter (summary, eras, regions, lenses, year range, `accent`,
   and a canonical `room` slug - the build fails on a missing/non-canonical room).
2. Replace the placeholder cover SVG in the house style (dark canvas, one accent,
   humanist serif title).
3. Write the body in MDX, importing only the islands you use. Style with the
   shared [design tokens](docs/design-tokens.md) rather than hard-coded values.
4. `npm run dev` and open `/essays/my-essay/`. It appears in the gallery, atlas
   timeline, and facets automatically - there is no registration step.

For **legacy** essays (self-contained HTML), see `SPECS.md §1`: the document goes
under `public/embed/<slug>/` and the essay record sets `status: legacy` with an
`embedPath`. Do not add redirects that touch `/embed/` - those paths are iframed
directly.

Legacy documents are preserved verbatim: no reformatting, no refactoring. The one
exception is house punctuation - em dashes are hyphens everywhere on the site,
including inside the embeds - which `npm run typography:validate` enforces as part
of the build. En dashes in numeric and date ranges (`1150–1750`) are correct and
left alone.

## Design & tokens

Use the shared visual language. The [design token reference](docs/design-tokens.md)
documents colour, typography, the fluid type scale, spacing, and motion. If you
need a value that no token expresses, add it to `tokens.css` so it is reusable.

## Local checks (run before every PR)

These mirror the CI gates - a red pipeline blocks merge.

```bash
npm run format:check   # Prettier
npm run lint           # ESLint
npm run check          # astro check (types + content schema)
npm run test           # Vitest unit tests
npm run registries:validate # shared contracts + cross-registry foreign keys
npm run build          # production build must succeed
npm run test:e2e       # Playwright e2e + axe accessibility
npm run lighthouse     # Lighthouse CI against ./dist (run npm run build first)
```

`npm run format` auto-fixes formatting.

**Browser coverage is narrower locally than in CI.** Playwright ships no WebKit
build for macOS 12, so the `webkit` and `mobile-safari` projects cannot run on
that host - CI installs chromium, firefox and webkit and is the only place all
three are exercised. If you are fixing a Safari-reported bug on macOS 12, expect
to confirm the fix in CI rather than locally.

`npm run lighthouse` needs a Chrome binary. It falls back to Playwright's
chromium when no system Chrome is installed, so run `npx playwright install
chromium` if it cannot find one.

New registries and cross-registry joins must be declared in
`data/contracts/registry-sources.json`. New interactions must declare whether
the content or Atlas performance profile applies and meet the browser,
accessibility, input and fallback contract in
`docs/terra-chartarum/support-and-performance.md`.

## Self-review checklist

Before opening a PR, confirm:

- [ ] Frontmatter validates (`npm run check`) and the cover image exists.
- [ ] `npm run build` succeeds and the essay renders at `/essays/<slug>/`.
- [ ] **Accessibility:** keyboard-navigable, every image has meaningful `alt`,
      colour contrast holds, and interactions respect `prefers-reduced-motion`.
- [ ] **Metadata:** eras/regions/lenses/room are correct; the essay shows up in
      the gallery, atlas timeline, and facets as expected.
- [ ] **Voice:** British spelling; the critical-cartography, "every map is an
      argument" register (see the manifesto).
- [ ] Prose and figures use design tokens, not hard-coded styles.

For essays, the full merge bar is the [essay definition of done](docs/essay-definition-of-done.md);
the pull-request template restates it (a11y / performance / metadata). Fill it in
honestly.

## Pull requests

- Branch from `main`; keep one ticket per PR where practical.
- Reference the ticket (e.g. `KAN-123`) in the PR title/description.
- Ensure all CI gates - Prettier, ESLint, astro check, Vitest, build,
  Playwright + axe, and Lighthouse - are green before requesting review.

Thank you for helping the atlas grow.
