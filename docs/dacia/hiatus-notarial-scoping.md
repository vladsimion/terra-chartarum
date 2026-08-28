# Hiatus `hs-notarial`: corpus scoping before any survey

Scoping for the `hw-notarial` family. **No act has been read.** The edition is in
copyright and unreachable from here - `degruyter.com` answers the DOI with a
202 bot interstitial and zero bytes - so this note defines the sample and fixes
the bibliography rather than reporting a survey.

Everything below is either verified against an open-access source, or marked as
unverified. The distinction matters: this is the state that was expected to
produce Trench B's first real `not_named`, and it now looks harder than that.

## What is verified

From the Bibliothèque de l'École des chartes review on Persée
([bec 1982](https://www.persee.fr/doc/bec_0373-6237_1982_num_140_1_450260_t1_0095_0000_2)),
read directly:

- The acts come from the **`Notai ignoti`** fonds of the Archivio di Stato di
  Genova. This partly answers the row's "archival-unit reconciliation pending":
  the fonds is now named, the individual unit is not.
- **123 acts**, matching the witness record.
- Ponzò's voyage: begun at **Naples on 16 April**, continued at **Pera in June**,
  reaching **Licostomo in August**.
- Physical: `In-8°, 211 pages, 3 planches h.-t.`; Paris-La Haye-New York,
  **Mouton**, 1980; EHESS, _Documents et recherches_ 13; preface by Hélène
  Ahrweiler.

From Crossref on the DOI: the record titles the notary **Ponzô** (circumflex),
publisher `De Gruyter`, ISBN 9783112319680, `type: book`.

## Three problems with the corpus as the row defines it

**1. The DOI is a reprint, not the edition.** `10.1515/9783112319680` resolves to
De Gruyter's reprint. The edition of record is Mouton 1980. The source row
currently reads as though De Gruyter Brill published it.

**2. A second edition of the same notary exists, and it is wider.** Geo
Pistarino, _Notai genovesi in Oltremare: Atti rogati a Chilia da Antonio di Ponzò
(1360-61)_, Genova 1971, Collana storica di fonti e studi 12 - cited inside the
Persée review. Pistarino covers **1360-61**; Balard's volume is **1360**. So
"the 123 acts" is Balard's selection from `Notai ignoti`, not the notary's
complete Chilia output, and an absence claim scoped to "the Kilia acts" would
overreach on two counts at once.

**3. The corpus is a travelling register, not a Kilia corpus.** Naples in April,
Pera in June, Licostomo in August. Acts redacted before the Danube mouths cannot
answer a question about naming at the Danube mouths, so the sample needs a
place-of-redaction filter before it is counted, not after.

There is also a live place-identity question underneath the title: Balard says
Kilia, the review says Licostomo, and Pistarino's series carries a separate
_Atti rogati a Caffa e a Licostomo_. Whether Chilia and Licostomo are one place
is exactly the kind of question this programme exists to study, so it should not
be settled silently by a row's `locator`.

**Unverified:** a search summary described the register as a _fragment_. The
review actually read does not say so. Do not record it until a source states it -
if true it constrains the absence claim further, which is precisely why it needs
checking rather than assuming.

## The absence class this family can actually reach

`hs-notarial` sits at `not_surveyed` and `hw-notarial` at
`applicability: applicable`. Before a survey is commissioned, the applicability
judgement should be revisited, because the neighbouring family was ruled the
other way on reasoning that applies here too:

| Family        | Applicability      | Class          | Reasoning on the row                                                                     |
| ------------- | ------------------ | -------------- | ---------------------------------------------------------------------------------------- |
| `hw-fiscal`   | `place_names_only` | `not_asked`    | fiscal enumeration answers settlement-name questions, not the learned macro-regional one |
| `hw-notarial` | `applicable`       | `not_surveyed` | not yet assessed                                                                         |

A commercial notarial instrument records parties, goods, prices and places of
transaction. Like a tax register, it names places constantly and has no occasion
to reach for a learned macro-regional label. If that reasoning made fiscal
`not_asked`, it is not obvious why notarial escapes it.

The counter-argument is in the row's own historical question, which is framed as
an either/or about the frame itself - _does the corpus use Dacia, **or instead**
port, polity and route names_. That question the corpus can answer, by showing
what its frame is. But then the finding is a positive one about genre, and the
absence of `Dacia` inside a port-and-route frame is a property of the genre
rather than evidence about the word's currency in 1360.

Either way `not_named` here would carry `evidential_weight: conditional`, which
the taxonomy already says "still needs a separately reviewed interpretation".
The interpretation has to survive the objection that no Genoese notary would
have written `Dacia` whatever its currency.

## What a reviewer should decide, in order

1. **Applicability first, survey second.** If `hw-notarial` is really
   `place_names_only` like `hw-fiscal`, the state resolves to `not_asked` and no
   paywalled survey is needed at all. That decision is free; the survey is not.
2. If the survey is still wanted, **define the sample as**: Balard 1980 acts
   pp. 23-194, filtered to those redacted at Chilia/Licostomo, with Pistarino
   1971 named as the wider comparison and the 1361 acts explicitly out of scope.
3. **Get access.** The 1980 volume is in copyright and this project has no route
   to it; the row's `licensed_access` posture needs an actual library route
   before the work can be scheduled.
4. Reconcile the individual `Notai ignoti` unit, and settle whether the accent is
   **Ponzò** (Persée, Pistarino) or **Ponzô** (Crossref).
