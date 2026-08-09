# Hiatus witness-family audit

KAN-348 freezes the minimum source families for the _Hiatus_ research timeline.
It does not certify a source reading and does not make an argument from silence.
The machine-readable audit is
[`hiatus-witness-families.csv`](../../data/dacia/reference/hiatus-witness-families.csv);
its IDs and file hash are frozen in
[`source-ledger-manifest.json`](../../data/dacia/reference/source-ledger-manifest.json).

## Frozen minimum

| Family              | Historical question                                                                              | Present decision                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Charters            | Which documentary acts use _Dacia_ or competing regional names, for what referents?              | Candidate; define issuer, date, and series sample before searching.                             |
| Chronicles          | How do narrative histories name Roman Dacia and the medieval polities treated as its successors? | Candidate; collate named editions and recensions.                                               |
| Papal registers     | Which curial names identify dioceses, rulers, and territories north of the Danube?               | Candidate; exact register and folio range still required.                                       |
| Notarial/commercial | What geographic vocabulary appears in a bounded Black Sea commercial corpus?                     | Candidate; reconcile edition acts to archival units.                                            |
| Ottoman fiscal      | What settlement names occur, and can the source answer the learned macro-regional question?      | `not_applicable` to macro-regional silence until an individual register's scope says otherwise. |
| Late cartography    | When does _Dacia_ return as a learned label alongside Hungary and Transylvania?                  | Candidate comparison; one 1570 atlas cannot date a general return.                              |

Every row separately records `coverage_scope`, `survival_limitations`, and
`silence_assessment`. These are not synonyms:

- **Coverage** says what the source set set out to record.
- **Survival** says what evidence may have been lost, omitted from a catalogue,
  or left undigitised.
- **Silence** is a claim about a reviewed witness. A candidate row may be
  `not_assessed` or `not_applicable`; it cannot claim `meaningful_silence`.

The fiscal row demonstrates the boundary. A tax register may answer a
settlement-name question while being unable to answer whether a learned writer
used _Dacia_ for a macro-region. It is marked `place_names_only` and
`not_applicable`, not silent.

## Source and rights posture

The candidate set points to the National Archives of Hungary/Hungaricana,
National Széchényi Library, Vatican repositories, Archivio di Stato di Genova
through a published notarial edition, and the Library of Congress. Repository,
citation, URL, and rights posture are mandatory fields.

`permission_required`, `licensed_access`, and `rights_review_required` are
deliberate blockers on reproduction. `no_known_restrictions` applies only to the
Library of Congress digitised atlas under its item-level advisory. Research
access never implies permission to republish an image.

## Next review pass

1. Define a bounded sample inside each family.
2. Record witness- or edition-level locators and exact queries.
3. Separate failed discovery, non-survival, and out-of-scope material.
4. Capture readings in `transcriptions.csv` and claims in `attestations.csv`.
5. Let a named reviewer decide whether any bounded, applicable source is
   meaningfully silent.

Until step five, _Hiatus_ may describe this audit and its limitations but may
not publish a source-silence count from it.
