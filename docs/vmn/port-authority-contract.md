# Port authority-table contract

`data/vmn/ports.csv` is the authority table. One row is one dated political or
functional phase; repeated `port_id` values are intentional. The compiled
FlatGeobuf is a projection of those rows, not another editing surface.

`data/vmn/port-contract.json` turns Jira's regional gazetteer acceptance
criteria into a build gate. Each group names its ticket, required stable IDs and
the status/polity/date/note facts that must match at least one authority row.
Groups with `exactPhaseCount: true` additionally prevent a phase from being
silently dropped or added.

The first contract set covers:

- Egypt: Alexandria and Damietta, including Alexandria's fondaco note;
- Black Sea/Sea of Azov/Crimea: Trebizond, Sinope, Samsun, Tana, Caffa and
  Soldaia;
- Cyprus: all Famagusta, Limassol and Kyrenia control phases;
- Levant: Beirut, Acre, Tyre and Sidon with host-sovereignty typing;
- the three Constantinople quarter phases from 1082 to 1453.
- Sicily's four open-ended staging-port rows;
- seven Duchy of the Archipelago ports as `feudatory` under the separate
  `duchy_archipelago` polity.

The global contract locks the current floor at 86 phases and 70 stable ports
(well above the original 24-node/20-port gate), plus coverage of every status
actually required by the compiled gazetteer.

## Quarter, colony and staging rules

| Situation                               | `status`               | Sovereignty rule                                               |
| --------------------------------------- | ---------------------- | -------------------------------------------------------------- |
| Venetian merchant enclave               | `commercial_quarter`   | Host polity remains in `polity_id`                             |
| Enlarged Latin-era jurisdiction         | `metropolitan_quarter` | Still not a sovereign colony                                   |
| Genoese concession or colony            | `rival_genoese`        | `polity_id = genoa`; never imply Venetian control              |
| Independent/allied call with privileges | `foreign_port`         | Host polity remains authoritative                              |
| Venetian fondaco/trading enclave        | `trading_post`         | Venetian institution under host suzerainty, explained in notes |
| Feudal Archipelago holding              | `feudatory`            | `polity_id = duchy_archipelago`, separate from Venice          |
| Navigational call without tenure claim  | `staging`              | Route function only; no sovereignty inference                  |
| Direct Venetian possession              | `subject` or `colony`  | Use only where direct sovereignty is explicitly sourced        |

These are classifications of the relationship represented by a dated row, not
synonyms for the place itself. A stable port can therefore change status across
phases without changing its ID.

The compiled QA gate also compares the complete `(port_id, valid_from)` key set
and feature count between `ports.csv` and `venetian-ports.fgb`, preventing a
stale, duplicated or partially assembled sprint output.

Run `make vmn` to check the contract before any binary is written, then
`make vmn-validate` to check the compiled layer.
