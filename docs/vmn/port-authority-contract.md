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

Run `make vmn` to check the contract before any binary is written, then
`make vmn-validate` to check the compiled layer.
