# Essay Starter Kit

How to add a new **native** essay to Terra Chartarum. (Legacy essays — full
self-contained HTML documents — are hosted differently; see `SPECS.md §1`.)

## Quick start

```bash
npm run create-essay -- --slug my-essay --title "My Essay Title"
```

This scaffolds `src/content/essays/my-essay.mdx` from the template and drops a
placeholder cover at `public/covers/my-essay.svg`. Then:

1. Edit the frontmatter (summary, eras, regions, lenses, yearFrom/yearTo, accent).
2. Replace the placeholder cover SVG (800×500 viewBox; match the house style —
   dark canvas, one accent colour, humanist serif title).
3. Write the body in MDX, importing only the islands you use.
4. `npm run dev` and open `/essays/my-essay/`.

The essay appears automatically in the gallery, the cross-essay atlas timeline,
and the faceted filters — everything reads from the content collection via
`src/lib/registry.ts`. No registration step.

## Frontmatter reference

Validated by `src/content/config.ts` (Zod). Required unless noted.

| Field                          | Type                 | Notes                                               |
| ------------------------------ | -------------------- | --------------------------------------------------- |
| `title`, `subtitle`, `summary` | string               | `summary` is the card/OG hook                       |
| `cover`                        | string               | path under `/public`, e.g. `/covers/my-essay.svg`   |
| `status`                       | `native` \| `legacy` | new essays are `native`                             |
| `eras`, `regions`, `lenses`    | string[]             | power the facets; `lenses` = your native axis names |
| `yearFrom`, `yearTo`           | number               | negative = BC; drives the timeline position         |
| `mapCount`, `readingMinutes`   | number               | optional, shown on cards                            |
| `accent`                       | string (hex)         | per-essay identity colour                           |
| `order`                        | number               | gallery/atlas sort key                              |
| `featured`                     | boolean              | surfaces on the landing page                        |
| `publishedAt`, `updatedAt`     | string               | ISO date                                            |
| `metaScores`                   | record 0–1           | optional harmonized meta-lens scores                |

## The component library (`src/components/islands/`)

All three are Astro components — server-rendered by default, shipping vanilla JS
only where interaction requires it. Framework choice (Preact/Svelte/React) is
deliberately deferred (ATLAS-401 spike); these need no runtime.

### `RadarChart`

```mdx
<RadarChart
  interactive
  axes={['Measure', 'Witness', 'Use', 'Cosmos', 'Power', 'Silence']}
  series={[
    { label: 'This essay', values: [0.8, 0.7, 0.6, 0.4, 0.55, 0.45] },
    { label: 'Corpus mean', values: [0.6, 0.6, 0.6, 0.6, 0.6, 0.6], color: 'var(--ink-muted)' },
  ]}
  caption="Optional caption."
/>
```

- `axes: string[]`, `series: { label, values (0–1), color? }[]`
- `interactive` adds hover-to-emphasize (a few lines of JS); omit for pure static.
- `size`, `rings` optional.

### `AdaptiveTimeline`

```mdx
<AdaptiveTimeline
  ticks={[1500, 1700, 1850, 2024]}
  events={[
    { year: 1507, label: 'Waldseemüller world map', href: '/essays/...' },
    { year: 1569, label: 'Mercator projection' },
  ]}
/>
```

- `events: { year, label, href?, accent? }[]`
- `compress` (default true) applies the shared square-root time scale.
- `from`/`to`/`ticks` optional.

### `CompareSlider`

```mdx
<CompareSlider start={50} beforeLabel="A" afterLabel="B">
  <img slot="before" src="/covers/before.svg" alt="…" />
  <img slot="after" src="/covers/after.svg" alt="…" />
</CompareSlider>
```

- Named slots `before` / `after` take any markup (img, svg, div).
- Pointer + touch + keyboard (focus the handle, arrow keys; Shift = larger step).

### `Scrollytelling`

```mdx
<Scrollytelling label="How a projection unrolls the globe">
  <svg slot="graphic" data-scrolly-figure>…</svg>
  <svg slot="graphic" data-scrolly-figure>…</svg>

  <div data-scrolly-step>**The globe.** …</div>
  <div data-scrolly-step>**The cut.** …</div>
</Scrollytelling>
```

- A sticky `graphic` pane plus a column of `data-scrolly-step` narrative blocks.
- Give the graphic ordered `data-scrolly-figure` panels and it cross-fades to the
  one matching the active step; or listen for the `scrolly:step` CustomEvent to
  drive a bespoke graphic.
- Rides the shared IntersectionObserver scroll-spy (`src/lib/scrollytelling.ts`)
  and is reduced-motion aware — under `prefers-reduced-motion` the graphic
  un-sticks and every figure reads in flow.

## Definition of done (see ATLAS-702)

- [ ] Frontmatter validates (`npm run check`) and cover exists.
- [ ] `npm run build` succeeds; essay renders at `/essays/<slug>/`.
- [ ] Keyboard-navigable; images have `alt`; respects reduced motion.
- [ ] Appears correctly in gallery, atlas timeline, and facets.
