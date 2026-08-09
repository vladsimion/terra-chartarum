# Entity identifier contract

This is the explanatory form of the KAN-376 contract. The normative family list,
reserved references and compatibility decisions live in
[`data/contracts/terra-chartarum.json`](../../data/contracts/terra-chartarum.json).

## Canonical references

A cross-programme reference has four parts:

```text
tc:{authority}:{family}:{localId}
```

For example, `tc:atlas:essay:cities-remember`,
`tc:vmn:route:muda_romania` and
`tc:cnd:place:plc-sarmizegetusa-regia` are globally unambiguous while preserving
the stable IDs already in production. Repository-local joins may continue to
store the shorter ID when the target registry is fixed by the schema. Any
Confluence record, Atlas state, citation or data release that crosses registry
or programme boundaries must use the qualified form or declare its target
registry alongside the local ID.

`authority` names the registry owner, not the current editor. `family` states
what kind of referent the ID denotes. A human-readable name, title, label or
translated form is never a primary join key.

## Families and namespaces

| Family       | Namespace      | Identity rule                                            |
| ------------ | -------------- | -------------------------------------------------------- |
| Essay        | `essay`        | The editorial work, independent of a later title change  |
| Map/object   | `map`          | One catalogue referent or witness object                 |
| Cartographer | `cartographer` | One person or corporate maker                            |
| Dataset      | `dataset`      | One versioned data product or authority table            |
| Place        | `place`        | One geographic referent, never one spelling              |
| Port         | `port`         | A place authority where port status is part of the model |
| Route        | `route`        | One route or explicitly generalized corridor             |
| Event        | `event`        | One dated event or evidence-bearing claim                |
| Layer        | `layer`        | One Atlas layer registration                             |
| Source       | `source`       | One bibliographic work, witness or source authority      |
| Period       | `period`       | One named or modelled temporal phase                     |
| Project      | `project`      | One programme, trench, essay or delivery project         |

New local IDs use lowercase ASCII slugs unless a specialist authority has a
frozen convention. Existing VMN uppercase source keys and other published IDs
remain valid inside their authority; qualifying them is safer than renaming
them.

## Immutability and collisions

An ID becomes immutable when it appears in a public URL, citation, data release
or externally consumed Atlas state. Titles and slugs may change without moving
that identity. Where a public URL must move, the old URL receives a permanent
redirect and the data release carries a migration mapping.

The build checks uniqueness twice: within each source registry and after
qualification as `tc:{authority}:{family}:{localId}`. A duplicate is an error.
The reservation list prevents retired or programme-root IDs being reused.

## Rename, merge, split and retirement

- **Rename:** retain the ID and edit display fields only.
- **Merge:** select one survivor; reserve every merged ID as an alias to it.
- **Split:** retain the old aggregate as deprecated and mint IDs for the new
  referents. Do not silently redirect an old plural identity to one child.
- **Retire:** reserve the ID permanently and record either its replacement or
  why it has none.
- **Supersede:** keep `replacedBy`/migration links. Never delete an externally
  referenced record merely because a better authority now exists.

Migration records must name the old reference, the replacement(s), the decision
date and the responsible authority. An alias is not permission to reuse the old
token for a different referent.

## Existing programmes

- Atlas essay, map, cartographer, bibliography, toponym and layer IDs keep their
  current local values under the `atlas` authority.
- VMN's unprefixed ports, routes and territories remain under `vmn`; external
  references qualify them rather than renaming shipped data.
- HSE retains its `hse-*` record IDs. `place_id` identifies the stable place;
  the row `id` identifies a dated role phase.
- CND retains `plc-`, `src-`, `att-`, `nmu-` and `nue-` local prefixes under
  the `cnd` authority.

The detailed adapter and backfill outcome is in
[Registry compatibility](legacy-registry-compatibility.md).
