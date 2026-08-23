# Dacia acquisition dossiers

Research dossiers for the programme's priority map families, in
[`reference/acquisition-dossiers.csv`](../../data/dacia/reference/acquisition-dossiers.csv).
Six families: Ptolemaic, Mercator-Hondius, Sanson, Zatta, Homann and Schwantz de
Springfels' Oltenia. The validator requires all six to exist, purchasable or
not.

## Three axes that never collapse

`acquisition_status`, `scholarly_validity` and `rights_status` are separate
columns because they are separate questions. A map does not become better
evidence because somebody bought it, or worse because a dealer's price was
declined, and the rights position of a reproduction is a third matter again.
Validity is therefore required on every row whatever the acquisition state - the
Schwantz dossier is `not_sought` and `established` at the same time, and that
combination is the normal case rather than a contradiction.

## A dossier cannot recommend what it has not identified

`plate_number`, `edition_state`, `publisher` and `comparable_records` are the
identifying fields. A dossier may only reach `recommended` when none of them is
`pending` **and** `verification_state` is `verified`; and a dossier claiming to
be verified may not leave any of them pending. That second rule is the one that
matters: the dangerous dossier is not the empty one, it is the one filled in
enough to look checked when nobody has checked it.

All six currently sit at `unverified`, and the readiness line in the gate says
so: **0 verified, 0 recommended**.

## The Ptolemaic rule

Tabula Europae numbering is **not stable across editions**. The plate covering
Dacia and Moesia does not carry the same number in the Bologna, Rome, Ulm,
Strasbourg, Mercator and later editions, so a number recalled without an edition
beside it is not a citation - it is a guess wearing a citation's clothes.

The validator enforces the consequence: a `ptolemaic` dossier carrying a
`plate_number` must name the `edition_state` that numbering belongs to, or leave
the plate `pending`. The dossier in the table leaves it pending, which is the
honest state until somebody opens a named edition and reads its own numbering.

## What each dossier still has to establish

The notes column carries the specific question per family, and they are not the
same question:

- **Mercator-Hondius** - state is determined by the verso text setting, not by
  the image, because the plates were reissued for decades.
- **Sanson** - the imprint is the state evidence; Mariette and later Jaillot
  issues differ there.
- **Zatta** - late and usually well preserved, so condition and whether the
  colour is original matter more than rarity.
- **Homann** - the Homann or Homann Erben imprint dates the sheet either side of 1730.
- **Schwantz** - worth a scholarly account whether or not a sheet ever reaches
  the collection: it is the survey behind the `pp-oltenia-1718` phase in the
  principalities layer.
