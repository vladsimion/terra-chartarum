# Terra Chartarum

An interactive historical-atlas portal — a gallery of cartographic visual essays
under one publication of record. Four bespoke long-form essays on the history and
politics of mapmaking are unified by a shared shell (landing, navigation, design
tokens, motion) while each keeps its own immersive interior.

Built with **[Astro](https://astro.build)** (static output, islands architecture),
TypeScript, Tailwind, and a CSS custom-property design-token layer.

> **Status:** M2 complete — unified portal with all four essays live, plus a
> reusable component library and MDX authoring pipeline for new essays.

## The essays

| Essay                                        | Scope                            | Native lens                                                                        |
| -------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| **The Cartographic Sacrifice**               | 8,000 yrs, global                | Accuracy · Usability · Navigation · Symbolism · Politics · Completeness · Richness |
| **Terra Sigillata · Lapidarium Dacicum**     | Dacia/Romania, 19 centuries      | Quinque Sigilla + Sex Lectiones                                                    |
| **Speculum Chartarum**                       | Antiquity → early-modern geodesy | Six Bearings: Geodesy · Witness · Cosmos · Fitness · Reach · Hand                  |
| **La Rotta e il Catasto** (Venice vs Sicily) | 1150–1750, Mediterranean         | Harley theory, 6-axis radar                                                        |

The four analytical vocabularies are harmonized — additively, never replacing —
onto **six canonical meta-lens dimensions** (Measure, Witness, Use, Cosmos, Power,
Silence) that power cross-essay discovery. The full crosswalk is published at
[`/colophon`](src/pages/colophon.astro).

## Architecture

- **Astro, HTML-first, static output** → portable `dist/` that runs from any host.
- **Shell wraps bespoke interiors.** Legacy essays are large self-contained HTML
  documents, preserved verbatim under `public/embed/<slug>/` and hosted inside an
  `<iframe>` isolation boundary (zero style/JS leakage). Native essays are authored
  in MDX and render inline.
- **Route ≠ asset:** the wrapper route `/essays/<slug>/` and the raw essay
  (`/embed/<slug>/`) never share an output path. Do not move raw essays back under
  `public/essays/`.
- **Islands** (`src/components/islands/`) are framework-agnostic Astro components:
  server-rendered SVG/HTML, vanilla JS only where interaction requires it.

```
src/
  pages/          index · essays/[slug] · essays/index · atlas · colophon · about · 404
  layouts/        PortalLayout (shell chrome)
  components/     Header · Footer · EssayCard
  components/islands/  RadarChart · AdaptiveTimeline · CompareSlider
  content/        essays/*.md(x) + config.ts (Zod schema)
  lib/            registry.ts (essays + meta-lens crosswalk)
  styles/         tokens.css · global.css
public/
  embed/<slug>/   legacy essays preserved verbatim
  covers/         essay cover art
starter/          new-essay template + authoring guide
scripts/          create-essay.mjs scaffold
```

See [`SPECS.md`](SPECS.md) for the full specification and
[`jira-import.csv`](jira-import.csv) for the roadmap/backlog (project key `ATLAS`).

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # -> dist/ (portable static)
npm run preview    # serve the build
npm run check      # astro check (types)
```

> If your global npm cache is sandboxed, use:
> `npm install --cache ./.npm-cache --no-audit --no-fund`

## Add a new essay

```bash
npm run create-essay -- --slug my-essay --title "My Essay Title"
```

This scaffolds a native MDX essay + placeholder cover from `starter/`. Edit the
frontmatter and body, then it appears automatically in the gallery, atlas
timeline, and facets — no registration step. Full guide in
[`starter/README.md`](starter/README.md).

## Roadmap

- **M1 — Portal MVP** ✅ unified site, all four essays live under one shell.
- **M2 — Platform** ✅ shared component library + MDX essay starter.
- **M3 — Atlas** ⏳ cross-essay MapLibre map + historical-GIS layer tier
  (PMTiles/COG), time-slider, faceted discovery.
- **M4 — Launch** — a11y, performance, deploy.
