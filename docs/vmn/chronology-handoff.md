# VMN chronology handoff

This handoff originally separated the route work that was structurally complete
from the page-level historical verification that required the named editions of
Lane and O’Connell. It closed KAN-251, KAN-252, KAN-254, KAN-255 and KAN-256
without pretending to close KAN-250 or KAN-253.

**KAN-154 has since completed the page-level pass.** Both anchor editions were
consulted directly: Frederic C. Lane, _Venice: A Maritime Republic_ (Johns
Hopkins University Press, 1973) and Monique O'Connell, _Men of Empire: Power and
Negotiation in Venice's Maritime State_ (Johns Hopkins University Press, 2009).

| Ticket  | Deliverable                                                                | Executable proof                                                           |
| ------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| KAN-251 | Seven normalized route records with window, calls, commodities and sources | `route-sequences.json` must equal every authority row in `routes.csv`      |
| KAN-252 | Ordered departure, intermediate call and arrival sequences                 | Every call resolves and occurs on the compiled path in the declared order  |
| KAN-254 | Corrected sea-path geometry                                                | Every route path is valid, follows its calls and stays off 1:10m land      |
| KAN-255 | First Atlas flip                                                           | `rotta_spine` targets `muda_romania` at 1450 with ports and routes enabled |
| KAN-256 | Discrepancy and editorial-decision log                                     | Every route start/end has a row in `chronology-discrepancies.csv`          |
| KAN-154 | Page-level chronology verification                                         | Every route **and possession** boundary has a page-cited, statused row     |

## Evidence state

`chronology-discrepancies.csv` now carries, for every dated boundary in spec
§5.5 (route windows and possession phases alike):

- `lane_value` / `oconnell_value` — the anchor's value with its page, in the
  form `value@pages` (`1797-05-12@p436`, `1206@p19+p162-163`); `not_in_source`
  records a consulted-but-silent anchor and is never an invented citation;
- `resolution` — one of `confirmed_spec`, `corrected_to_source`,
  `retained_spec_envelope`;
- `status` — `verified_page_level` for every row.

Two seed dates were **corrected** against the anchors:

- `morea` direct rule now starts **1206-01-01** (was 1207) — O'Connell p. 19
  and appendix pp. 162–163 date possession of Modon and Coron to 1206; Lane
  p. 242 dates the award to the 1204 partition. `private_aegean` was aligned.
- `negroponte` condominium now starts **1211-01-01** (was 1209) — O'Connell
  p. 164 n. r records the bailo elected regularly from 1211; the 1209
  terzieri-treaty date appears in neither anchor.

The headline documented discrepancy is `muda_dalmatia`: Lane records **no
scheduled Dalmatia muda in 1409–1500** — his only scheduled Dalmatian galley
line is the Spalato service begun after 1577 and auctioned from 1592 (p. 303).
The route remains an explicitly editorial coastal-service construct keyed to
the possession window, and its ledger rows say so.

That state is enforced by `make vmn-validate`:

- all seven `routes.csv` rows must appear unchanged in the sequence contract,
  which must carry `page_level_verified_KAN_154`;
- each declared call must resolve to a port or waypoint and occur in order on
  the path;
- route interiors cannot cross the pinned Natural Earth 1:10m land layer except
  for the documented harbour tolerance;
- the first Atlas flip must resolve by stable IDs;
- the ledger must mirror **every** route and possession boundary with non-empty
  page-verified anchor values, a controlled resolution and an editorial note;
- every `source_keys` entry resolves in `sources.csv`, with optional `:pNN`
  page suffixes validated for syntax.

KAN-250 (fill Lane/O'Connell values) and KAN-253 (page-cited routes dataset)
are unblocked: their content now exists in the authority tables and ledger and
can be reviewed against this handoff.
