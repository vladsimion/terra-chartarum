# Meta-lens native-axis inventory

Date: 2026-07-29

Ticket: KAN-262

Coverage gate: KAN-264

Every declared `lenses` term in the content collection is preserved verbatim
and mapped in `src/lib/registry.ts`. The inventory test repeats the content
declarations deliberately: a new or renamed axis must update both the crosswalk
and the reviewed inventory before the unit suite passes.

| Essay                         | Native axes                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------- |
| Cartographic Sacrifice        | Accuracy; Usability; Navigation; Symbolism; Politics; Completeness; Richness |
| Dacia                         | mensvra; auctoritas; nomina; limes; silentium                                |
| Speculum                      | Geodesy; Witness; Cosmos; Fitness; Reach; Hand                               |
| Venice–Sicily                 | MARE; TERRA; RETE; CONFINE; CIRCOLAZIONE; IMPOSIZIONE                        |
| Invisible Maps of Trade       | Network; Jurisdiction; Schedule; Labour; Commodity; Silence                  |
| Maps That Age                 | Plate; State; Edition; Wear; Revision; Archive                               |
| Invisible Maps of Religion    | Sacred centre; Orientation; Pilgrimage; Memory; Diagram; Print               |
| Cities Remember               | Fragment; View; Wall; Ground; Risk; Registration                             |
| Shape of a Civilization       | Terrain; Settlement; Network; Ecology; Territory                             |
| Cartography of Empire         | Empire; Administration; Boundary; Atlas; Classification                      |
| When Maps Create Countries    | Nation; Survey; Schooling; Repetition; Boundary                              |
| Projection and Perspective    | Projection; Perspective; Distortion; Scale; Viewpoint                        |
| Geography of Power            | Jurisdiction; Infrastructure; Access; Property; Refusal                      |
| Invisible Maps of Migration   | Movement; Archive; Border; Uncertainty; Diaspora                             |
| Palimpsest Landscapes         | Landscape; Archaeology; Survey; Memory; Reconstruction                       |
| Classification Is Cartography | Classification; Catalogue; Taxonomy; Search; Uncertainty                     |
| Starter example               | Measure; Witness; Use; Cosmos; Power; Silence                                |

## Repeated concepts

Repeated labels retain one mapping only where their meaning is consistent
enough for discovery:

- `Network` privileges Use while acknowledging Power.
- `Jurisdiction` and `Boundary` map to Power.
- `Archive` privileges Witness while retaining Silence.
- `Survey` privileges Measure while acknowledging Power.
- `Memory` joins Witness and Cosmos.
- `Classification` joins Cosmos and Power.
- `Uncertainty` maps to Witness because it qualifies the evidence, not because
  uncertainty is a score of low quality.

Near-synonyms remain distinct. `Border`, `Boundary`, `limes` and `CONFINE` are
not renamed into one native term even though they meet at Power. `Plate`,
`State`, `Edition` and `Revision` preserve the production distinctions required
by _Maps That Age_.

## Resolved gaps

The prior crosswalk covered only the four legacy vocabularies. KAN-262 found
unmapped axes in every newer native essay. Those terms now map explicitly.
There are no unresolved axes, duplicate labels within an essay, zero-weight
mappings or normalized values outside 0–1; KAN-264 enforces that result.
