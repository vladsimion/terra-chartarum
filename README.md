# Terra Chartarum

An interactive historical-atlas portal - a gallery of cartographic visual essays
under one publication of record. Bespoke long-form essays on the history and
politics of mapmaking are unified by a shared shell (landing, navigation, design
tokens, motion) while each keeps its own immersive interior.

Built with **[Astro](https://astro.build)** (static output, islands architecture),
TypeScript, Tailwind, and a CSS custom-property design-token layer.

> **Status:** Live. The unified portal, reusable component/island library, MDX
> authoring pipeline, interactive Atlas + historical-GIS tier, collection catalogue,
> cartographer & bibliography registries, unified search, and the seven-room
> cosmography have all shipped - the four founding essays have grown into a
> multi-room corpus. The Venetian Maritime Network atlas layer is live; only its
> chronology source-verification (Jira KAN-140 / KAN-154) remains open, pending
> page-level Lane & O'Connell excerpts.

## The essays

| Essay                                        | Scope                            | Native lens                                                                        |
| -------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| **The Cartographic Sacrifice**               | 8,000 yrs, global                | Accuracy · Usability · Navigation · Symbolism · Politics · Completeness · Richness |
| **Terra Sigillata · Lapidarium Dacicum**     | Dacia/Romania, 19 centuries      | Quinque Sigilla + Sex Lectiones                                                    |
| **Speculum Chartarum**                       | Antiquity → early-modern geodesy | Six Bearings: Geodesy · Witness · Cosmos · Fitness · Reach · Hand                  |
| **La Rotta e il Catasto** (Venice vs Sicily) | 1150–1750, Mediterranean         | Harley theory, 6-axis radar                                                        |

_These four founding essays now sit within a larger seven-room corpus - browse the
full set at [`/essays`](src/pages/essays/index.astro)._

The four analytical vocabularies are harmonized - additively, never replacing -
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
  pages/          index · essays/ · atlas · collection/ · cartographers/ · rooms/
                  bibliography · colophon · about · rss.xml · search-index.json · 404/500
  layouts/        PortalLayout (shell chrome)
  components/     Header · Footer · EssayCard · CatalogueCard · room + section chrome
  components/islands/  RadarChart · AdaptiveTimeline · CompareSlider · Scrollytelling
                  AtlasMap · DeepZoomViewer · CiteExport · SiteSearch · VMN explorers
  content/        essays/*.md(x) + config.ts (Zod schema)
  data/           rooms.ts (seven-room taxonomy) + navigation
  lib/            registry · corpus · geo · cartographers · bibliography · cite
                  vmn* · toponyms · meta-lens · analytics · …
  styles/         tokens.css · global.css
public/
  embed/<slug>/   legacy essays preserved verbatim
  geo/            Natural Earth + Venetian Maritime Network FlatGeobuf layers
  covers/ og/     essay cover art + social cards
data/vmn/         VMN authority tables (CSV) → compiled FGB via scripts/vmn (Makefile)
starter/          new-essay template + authoring guide
scripts/          create-essay, geo/build pipelines, validators
```

See [`SPECS.md`](SPECS.md) for the specification and
[`docs/roadmap.md`](docs/roadmap.md) for the essay roadmap. The live backlog is Jira
project `KAN`; `jira-import.csv` is the original `ATLAS`-keyed import seed, kept for
provenance.

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # -> dist/ (portable static)
npm run preview    # serve the build
npm run check      # astro check (types)
npm run geo:validate # verify published GIS assets and release metadata
```

> If your global npm cache is sandboxed, use:
> `npm install --cache ./.npm-cache --no-audit --no-fund`

## Add a new essay

```bash
npm run create-essay -- --slug my-essay --title "My Essay Title"
```

This scaffolds a native MDX essay + placeholder cover from `starter/`. Edit the
frontmatter and body, then it appears automatically in the gallery, atlas
timeline, and facets - no registration step. Full guide in
[`starter/README.md`](starter/README.md).

Historical GIS assets are provenance-tracked, integrity-checked and served at
content-versioned URLs. See the [geo-layer publication guide](docs/geo-layers.md)
for the release and Atlas integration contract.

Reusable MDX patterns and their accessibility/composition conventions are
tracked in the [shared component inventory](docs/component-library.md).

## Deploy

`npm run build` emits a portable static `dist/` that deploys to **Cloudflare Pages**
(output `dist/`, git integration with per-PR previews). The canonical origin is
`site` in `astro.config.mjs` (`https://terra-chartarum.pages.dev`), which drives the
canonical tags, sitemap and RSS. The same `dist/` runs on any static host. Full
procedure - gates, smoke tests, rollback - in the
[launch runbook](docs/launch-runbook.md).

## Roadmap

- **M1 - Portal MVP** ✅ unified site, the founding essays live under one shell.
- **M2 - Platform** ✅ shared component library + MDX essay starter.
- **M3 - Atlas** ✅ cross-essay MapLibre map + historical-GIS layer tier
  (PMTiles/COG/FlatGeobuf), time-slider, faceted discovery.
- **M4 - Launch** ✅ accessibility, performance, deploy.
- **M5 - Collection catalogue** ✅ rich map schema, cartographer & bibliography
  registries, unified search, citation export.
- **Cosmography & editorial waves** ✅ seven-room taxonomy, Wave 1–2 essays, and the
  Venetian Maritime Network GIS layer. See [`docs/roadmap.md`](docs/roadmap.md) and
  Jira `KAN` for the live plan; VMN chronology page-verification (KAN-140 / KAN-154)
  is the one open thread.
