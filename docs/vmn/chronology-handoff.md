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

`chronology-discrepancies.csv` now carries **51 rows across four subject types** -
14 route, 22 possession, 6 quarter/fondaco privilege and 9 port - and for every
dated boundary in spec §5.5:

- `lane_value` / `oconnell_value` - the anchor's value with its page, in the
  form `value@pages` (`1797-05-12@p436`, `1206@p19+p162-163`); `not_in_source`
  records a consulted-but-silent anchor and is never an invented citation;
- `event_type` - the spec §5.5 taxonomy (`territorial_acquisition`,
  `territorial_loss`, `administrative_change`, `treaty_effective`,
  `privilege_change`, `convoy_window`, plus `navigation_window` for the two
  representative private corridors §5.5's convoy taxonomy did not anticipate);
- `resolution` - one of `confirmed_spec`, `corrected_to_source`,
  `retained_spec_envelope`;
- `status` - `verified_page_level` for every row.

Coverage is asymmetric by design. Route, possession and privilege windows are few
and wholly spec-defined, so the gate requires the ledger to mirror them
exhaustively. Port phases are the long tail (86 rows) that the anchors date only
in part, so port rows are opt-in - added where a correction or a documented
conflict exists - and the gate checks them for referential integrity instead.

Eight seed dates were **corrected** against the anchors:

- `morea` direct rule now starts **1206-01-01** (was 1207) - O'Connell p. 19
  and appendix pp. 162–163 date possession of Modon and Coron to 1206; Lane
  p. 242 dates the award to the 1204 partition. `private_aegean` was aligned.
- `negroponte` condominium now starts **1211-01-01** (was 1209) - O'Connell
  p. 164 n. r records the bailo elected regularly from 1211; the 1209
  terzieri-treaty date appears in neither anchor.
- `coron` and `modon` port phases now start **1206-01-01** (were 1207) and the
  `negroponte` port phase **1211-01-01** (was 1209). These three rows were left
  inconsistent with the corrected `events.csv` by the first KAN-154 pass; the
  matching `port-contract.json` (KAN-205) constraints were updated with them.
- `lesina` now starts **1421-01-01** (was 1420) - O'Connell dates its submission
  to March 1421 (p. 30), and his appendix gives 1421–1797 (p. 163), while the
  other Dalmatian islands submitted in 1420.
- `malvasia` now starts **1464-01-01** (was 1460) and `zante` **1482-01-01**
  (was 1485), both per O'Connell's Appendix A (pp. 163–164).

Two headline documented discrepancies:

- **`muda_dalmatia`.** Lane records **no scheduled Dalmatia muda in 1409–1500** -
  his only scheduled Dalmatian galley line is the Spalato service begun after
  1577 and auctioned from 1592 (p. 303). The route remains an explicitly
  editorial coastal-service construct keyed to the possession window.
- **`trebizond_quarter`.** Lane dates the large fortified Venetian quarter at
  Trebizond to _after_ the 1319 commercial treaty with its emperor (p. 129), not
  to the 1204 partition that the record's `validFrom` asserts. The 1204 start is
  retained only as the outer envelope of Venetian commercial presence.

Intra- and inter-source variances are recorded rather than silently resolved:
O'Connell's narrative dates Nauplion 1389 (p. 25) while his own appendix says
1388 (p. 164); his appendix counts Zaratine domination from c.1000 (p. 164) where
the spec dates the 1202 Fourth Crusade submission; and the seven Cyclades
feudatory phases are attested only as established "by 1212" (p. 18), which
licenses no start year, so the 1207 envelope stands.

That state is enforced by `make vmn-validate`:

- all seven `routes.csv` rows must appear unchanged in the sequence contract,
  which must carry `page_level_verified_KAN_154`;
- each declared call must resolve to a port or waypoint and occur in order on
  the path;
- route interiors cannot cross the pinned Natural Earth 1:10m land layer except
  for the documented harbour tolerance;
- the first Atlas flip must resolve by stable IDs;
- the ledger must mirror **every** route, possession and privilege boundary with
  non-empty page-verified anchor values, a controlled `event_type`, a controlled
  resolution and an editorial note; port rows must name a real phase and quote
  its spec value;
- every `source_keys` entry resolves in `sources.csv`, with optional `:<locator>`
  suffixes validated for syntax.

## Citation-locator correction

The first KAN-154 pass cited Lane's Chronology as `pxvi`/`pxvii`. The content of
those citations was correct, but Lane's Chronology carries **no printed folio**, so
the page numbers were inferred rather than read. They are now `LANE1973:chronology`,
and the gate accepts only printed pages or the named locators `chronology` and
`appendix-a`. The rule this enforces: a locator must be readable in the source.

All eight subtasks of KAN-154 are satisfied by this pass - KAN-250, KAN-253,
KAN-289, KAN-290, KAN-291, KAN-292, KAN-293 and KAN-294 - with their content in
the authority tables, the privilege contract and the ledger.
