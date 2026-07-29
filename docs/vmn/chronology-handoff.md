# VMN chronology handoff

This handoff separates the route work that is structurally complete from the
page-level historical verification that still requires the named editions of
Lane and O’Connell. It closes KAN-251, KAN-252, KAN-254, KAN-255 and KAN-256
without pretending to close KAN-250 or KAN-253.

| Ticket  | Deliverable                                                                 | Executable proof                                                                 |
| ------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| KAN-251 | Seven normalized route records with window, calls, commodities and sources | `route-sequences.json` must equal every authority row in `routes.csv`             |
| KAN-252 | Ordered departure, intermediate call and arrival sequences                 | Every call resolves and occurs on the compiled path in the declared order        |
| KAN-254 | Corrected sea-path geometry                                                 | Every route path is valid, follows its calls and stays off 1:10m land             |
| KAN-255 | First Atlas flip                                                            | `rotta_spine` targets `muda_romania` at 1450 with ports and routes enabled        |
| KAN-256 | Discrepancy and editorial-decision log                                      | Every route start/end has a row in `chronology-discrepancies.csv`                 |

## Evidence boundary

The route topology is structurally verified. The exact chronology is not.
`chronology-discrepancies.csv` carries the specification value and the editorial
decision to retain it provisionally. Lane and O’Connell fields are deliberately
empty until the exact editions and pages can be inspected.

That distinction is enforced by `make vmn-validate`:

- all seven `routes.csv` rows must appear unchanged in the sequence contract;
- each declared call must resolve to a port or waypoint and occur in order on
  the path;
- route interiors cannot cross the pinned Natural Earth 1:10m land layer except
  for the documented harbour tolerance;
- the first Atlas flip must resolve by stable IDs; and
- the discrepancy ledger must cover both chronological boundaries for every
  route while page-level fields remain empty and status remains blocked.

When the two source editions become available, KAN-250 should fill the Lane and
O’Connell values and record any actual conflict. KAN-253 can then add verified
page citations to the integration dataset. Until then, the empty cells are a
release control, not missing editorial work.
