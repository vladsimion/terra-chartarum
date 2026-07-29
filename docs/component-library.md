# Shared essay component inventory and API

This inventory audits repeated structures across the five published essays and
sets the composition contract for future native MDX work. Components should
stage an argument; they are not a reason to make every essay look identical.

## Prioritised inventory

| Priority | Pattern                        | Shared implementation                  | Current evidence                  | Reuse gap / decision                                  |
| -------- | ------------------------------ | -------------------------------------- | --------------------------------- | ----------------------------------------------------- |
| P0       | Section anchor + room passage  | `Section`                              | Venice–Sicily, starter sample     | Keep IDs authored and frontmatter-aligned             |
| P0       | Adaptive chronology            | `AdaptiveTimeline`                     | starter sample, Atlas scale       | Accept events; never own research data                |
| P0       | Scrollytelling                 | `Scrollytelling` + `scrollytelling.ts` | Venice–Sicily, starter sample     | Graphic stays slot-composed                           |
| P0       | Layer comparison               | `CompareSlider`                        | starter sample                    | Any image/SVG through named slots                     |
| P0       | Analytical scoring             | `RadarChart`                           | Venice–Sicily, starter sample     | Axes and series remain essay-owned                    |
| P1       | Deep image inspection          | `DeepZoomViewer`                       | native essay toolkit              | IIIF rights/provenance stay outside the viewer        |
| P1       | Citation export                | `CiteExport`                           | bibliography and native essay use | Consumer supplies citation payload                    |
| P1       | Port phase profile             | `PortProfilePopover`                   | Venice–Sicily                     | VMN-specific data adapter, generic popover semantics  |
| P1       | Contracting territory sequence | `ContractionSequence`                  | Venice–Sicily                     | Domain-specific; do not prematurely generalise        |
| P2       | Route/commodity network        | `VmnNetworkExplorer`                   | standalone VMN embed              | Domain-specific graph projected from published routes |

The worked `starter-example.mdx` renders every P0 interactive pattern in the
real MDX pipeline. `starter-components.test.ts` keeps it aligned with the
starter imports and author guide.

## Component contract

### Props

- Prefer serialisable data and explicit labels. Do not fetch inside a visual
  component when the page can resolve data at build time.
- Use camelCase names and domain language (`events`, `axes`, `series`) rather
  than implementation language.
- Optional behaviour must have a readable static default. Boolean props should
  add a capability (`interactive`, `compress`), not negate one.
- Validate paired arrays and ranges before rendering; fail the build on
  structurally invalid content.

### Slots and composition

- Use named slots when the caller owns rich markup: `before`/`after`,
  `graphic`, and prose steps.
- Keep prose in MDX. Components own layout, state and semantics, not the
  essay's argument.
- Prefer a small specialised component plus a build-time data adapter over a
  universal configuration object.

### Theming

- Consume shared CSS tokens (`--canvas`, `--panel`, `--ink`, `--line`,
  `--gold`, type and motion tokens).
- Accept an accent or series colour only where the data needs distinction.
- Never require global selectors from an essay; component styles remain scoped,
  with `:global()` limited to third-party injected DOM.

### Accessibility and enhancement

- Server-render the complete title, caption, data labels and fallback reading
  order.
- Every control has a native element or explicit role, accessible name,
  keyboard path and visible focus state.
- Announce changed values with a restrained live region; do not narrate pointer
  hover alone.
- Respect reduced motion and make the unfurled static reading order coherent.
- If WebGL, JavaScript or a remote image service fails, retain the authored
  prose and a useful list/table/index.

### Authoring rule

Start from `starter/essay.mdx.template`, delete unused imports, and add at most
one new interactive pattern per essay. A proposed extraction belongs here only
after two real uses—or when one complex, data-backed pattern has a clear second
consumer.
