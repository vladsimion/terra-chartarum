# Terra Chartarum shared contracts

These contracts freeze the programme-wide rules that individual corpora extend.
The machine-readable authority is
[`data/contracts/terra-chartarum.json`](../../data/contracts/terra-chartarum.json);
the documents in this directory explain how to apply it.

| Contract                                                                     | Ticket            | Governs                                                    |
| ---------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------- |
| [Entity identifiers](entity-identifiers.md)                                  | KAN-376           | Stable IDs, namespaces and migrations                      |
| [Evidence and reconstruction](evidence-and-reconstruction.md)                | KAN-377           | Evidence tiers, confidence, dates and geometry provenance  |
| [Lifecycle and publication authority](lifecycle-and-publication.md)          | KAN-378           | Review, rights and publication transitions                 |
| [Registry compatibility](legacy-registry-compatibility.md)                   | KAN-379 / KAN-394 | Existing adapters, conformance matrix and bounded backfill |
| [Browser, accessibility and performance support](support-and-performance.md) | KAN-380           | Supported clients and release budgets                      |

`data/contracts/registry-sources.json` inventories the existing registries and
their declared foreign keys. `npm run registries:validate` loads those sources
directly; it is an integrity overlay, not a replacement data store.

Specialist contracts remain authoritative inside their domains where they are
stricter. In particular, the CND review rule, the VMN source ledger and the HSE
promotion rules are not weakened by these common minimums.

## Public information architecture

The seven primary destinations are **Essays · Rooms · Atlas · Collection ·
Cartographers · Bibliography · About**. Bibliography is the global scholarly
evidence lens; Colophon remains available from the footer.

### Atlas Handbook discoverability

The Atlas Handbook is a first-class companion beneath Atlas, not an eighth
primary destination. The Atlas introduction and live controls link to the
Handbook, layer dossiers deep-link to their canonical Handbook records, the
homepage pairs its Atlas route with a Handbook route, and the footer provides a
global fallback. “Handbook” is retained because this is the Atlas's scholarly
and interpretive manual, not generic product help.
