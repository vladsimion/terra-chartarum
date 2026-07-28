# VMN essay ↔ Atlas deep links

This is the stable linking contract for the Venetian Maritime Network (VMN).
Essay references and Atlas reverse links use published IDs; they never copy
coordinates, geometry, dates, ownership labels, or display prose.

## Atlas URL parameters

The Atlas accepts these query parameters:

| Parameter   | Value                                               | Behaviour                                                                              |
| ----------- | --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `year`      | integer year                                        | Sets the time slider. Values outside the Atlas range are clamped.                      |
| `date`      | integer year                                        | Legacy alias for `year`; `year` wins when both are present.                            |
| `zoom`      | number                                              | Sets the map zoom, clamped to MapLibre's supported range.                              |
| `layers`    | comma-separated VMN layer IDs                       | Enables the named layers; unknown layer IDs are ignored.                               |
| `beat`      | stable `beat_id` from `data/vmn/atlas_links.csv`    | Resolves the beat's year, layers, target type, and target ID.                          |
| `port`      | stable `port_id`                                    | Enables the ports layer, focuses the port, and opens its object popover.               |
| `route`     | stable `route_id`                                   | Enables the routes layer, fits/highlights the route, and opens a return link.          |
| `territory` | stable `territory` value from the possessions layer | Enables the possessions layer, fits/highlights the territory, and opens a return link. |

Canonical layer IDs are:

- `venetian-ports`
- `venetian-routes`
- `venetian-possessions`

Target parameters infer their required layer, so a concise link such as
`/atlas?year=1450&port=modon` is valid. Explicit target parameters take
precedence over a beat's target; explicit `year` and `layers` likewise override
the beat defaults.

Unknown beats, targets, layers, and malformed numeric values fail safely: the
Atlas remains usable, does not claim a resolved target, and ignores the invalid
state.

## Forward links: essay → Atlas

The authority table is
[`data/vmn/atlas_links.csv`](../../data/vmn/atlas_links.csv):

```text
beat_id,target_type,target_id,year,layer_ids,display_mode
```

- `beat_id` is a stable essay-beat slug and is unique.
- `target_type` is `port`, `route`, or `possession`.
- `target_id` must resolve to the corresponding compiled Atlas layer.
- `layer_ids` is pipe-separated and contains only canonical layer IDs.
- `display_mode` is `popup` for ports or `highlight` for routes/possessions.

Examples:

```text
/atlas?beat=port_modon
/atlas?year=1450&layers=venetian-ports,venetian-routes&port=modon
/atlas?year=1450&route=muda_romania
/atlas?year=1500&territory=morea
```

The CSV stores IDs and view state only. `src/lib/vmn-atlas-links.ts` generates
the canonical URLs and the essay consumes those generated links.

## Reverse links: Atlas → essay

VMN layer metadata declares a structured `essayLinks` entry with:

- `slug`: the native essay slug (`venice-sicily`);
- `sectionId`: a stable `<Section id>` that also appears in essay frontmatter;
- `label`: the human-readable passage title.

The current mappings are:

| Atlas layer            | Essay passage                        |
| ---------------------- | ------------------------------------ |
| `venetian-ports`       | `/essays/venice-sicily/#rotta`       |
| `venetian-routes`      | `/essays/venice-sicily/#rotta`       |
| `venetian-possessions` | `/essays/venice-sicily/#contrazione` |

These links appear in each Atlas layer description and in focused VMN object
views. A section ID is a published identifier: do not rename or reuse it after
release. Add a new passage ID instead and retain redirects when a move is
unavoidable.

## Validation

The automated checks enforce that:

- every forward target exists in the compiled ports, routes, or possessions FGB;
- every generated URL carries the intended year, layer set, and target;
- beat aliases resolve while explicit URL state retains precedence;
- every reverse link points to both a frontmatter section record and a rendered
  `<Section id>` in the native essay;
- browser navigation applies valid targets and leaves invalid targets in a safe
  unfocused state.
