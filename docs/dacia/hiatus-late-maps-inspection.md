# Hiatus late cartography: Ortelius 1570 plate inspection

Witness inspection of the `hw-late-maps` family, carried out so a reviewer's pass
is a check rather than a hunt. It found the target **named** rather than absent,
which is why `hs-late-maps` no longer exists as a timeline state - see
[Where the readings were filed](#where-the-readings-were-filed).

**Nothing here has been promoted.** Every record this inspection produced sits at
`normalized`, the machine ceiling; `hw-late-maps` itself is untouched and still
`candidate`.

## What was inspected, and what was not

The witness row names the Library of Congress copy, `G3200m.GCT00126`. **That copy
was not reachable**: `www.loc.gov` returns a Cloudflare bot-verification
interstitial to both curl and a browser, and no bypass was attempted. The
inspection below is therefore of a **different impression** - the David Rumsey
copy of the same 1570 first edition - so the readings are filed against a new
source record, `src-ortelius-theatrum-1570-rumsey`, and the LoC-based
`src-ortelius-theatrum-1570` is left untouched as an unexamined lead. Citation
and object examined therefore match; what remains unknown is how the two copies
compare.

| Rumsey List No | Series | Page | Sheet                                         | IIIF id                      |
| -------------- | -----: | ---: | --------------------------------------------- | ---------------------------- |
| 10000.093      |     93 |   42 | _Hungariae Descriptio, Wolfgango Lazio Auct._ | `RUMSEY~8~1~275306~90048459` |
| 10000.094      |     94 |   43 | Text page, _Transsylvania. 43_                | `RUMSEY~8~1~275307~90048458` |
| 10000.095      |     95 |   43 | _Transilvania_ (Sambucus)                     | `RUMSEY~8~1~275308~90048457` |
| 10000.096      |     96 |   44 | Text page, _Poloniae Regnum 44_               | `RUMSEY~8~1~275309~90048456` |

Publication: _Theatrum Orbis Terrarum_, Antwerp, Gielis Coppens van Diest, 1570;
Koeman Ort 1B, Van der Krogt 31:001B. Both map sheets are 10259 x 7106 px.

**Sequence discrepancy to resolve.** The witness row reads "Hvngaria images 93-94
and Transsylvania images 95-96". In the Rumsey copy 94 is the _Transylvania_ text
page, not a Hungary sheet, so the row's grouping does not match this copy's
sequence. The row's own note already warns that "cataloguing or image sequence
require verification"; this is that warning coming true.

## Readings

All readings are from the images at the crop regions given, which are IIIF
`x,y,w,h` on the full-resolution sheet.

### Hungary sheet (Lazius), map face

Crop `6550,2400,1900,950`:

> TRANSILVANIA. / HERDEL, **olim** / **Dacia ne**=/**diterr**:

Crop `7300,3450,1900,950`:

> TRANSASPINA / HVNG / HAVASALFEVLDE / **olim** / **DACIA ALPESTRIS**.

The same crop also carries `Varhel` glossed `Vlpia Traiana Zarmisgetusa`, plus
`WALACHIAE PARS` and `MOESIA INFERIOR`.

### Transylvania sheet (Sambucus), lower-left title cartouche

Crop `1750,5150,1750,900`, attribution line enlarged at `2150,5600,800,320`:

> HANC VLTRA·VEL TRAN / SILVANIAM, QVAE ET PANNO / **DACIA**, ET **DACIA
> RIPENSIS**, / VVLGO SIBEMBVRGEN DICITVR, / ę didit Viennę A° 1566. Nobiliß.
> atq̃ Doctiß. / Ioēs Sābucus Pannonius

`PANNO` and `DACIA` are split across a line break. The attribution carries
abbreviation macrons - `Ioēs Sābucus` - so Rumsey's expansion to _Ioannes
Sambucus Pannonius_ is sound. The upper-centre cartouche reads `TRANSILVANIA.`
only.

## What this means for the state

Dacia is **named**, on both sheets, at the focal locators - and always in the
antiquarian `olim` register, as a learned gloss subordinated to a contemporary
or vernacular name:

| Contemporary name           | Learned gloss              | Sheet                   |
| --------------------------- | -------------------------- | ----------------------- |
| Transilvania / Herdel       | _olim_ Dacia Mediterranea  | Hungary (Lazius)        |
| Transalpina / Havasalfevlde | _olim_ Dacia Alpestris     | Hungary (Lazius)        |
| Transilvania / Sibemburgen  | Pannodacia, Dacia Ripensis | Transylvania (Sambucus) |

Note the tension in the third row against the first: **Transylvania is glossed
as Dacia Mediterranea on Lazius's sheet and as Pannodacia / Dacia Ripensis on
Sambucus's cartouche - two different learned equations for one territory inside
a single atlas.** That is a finding about how the label returns, not a defect to
reconcile away.

## Where the readings were filed

The absence taxonomy has no class for a positive attestation: all six values in
`hiatus-absence-classes.csv` describe an absence or a workflow blocker, and
`named_elsewhere` means absent _at_ the focal locator, which is the opposite of
what these plates show. Rather than put a presence value in a column named
`absence_class`, `hs-late-maps` was removed from the absence timeline and the
readings were filed where a lexical event belongs:

| Record                                 | Table            | Carries                                    |
| -------------------------------------- | ---------------- | ------------------------------------------ |
| `nmu-dacia-transilvania-lazius-1570`   | `name-uses`      | Transylvania _olim_ Dacia Mediterranea     |
| `nmu-dacia-transalpina-lazius-1570`    | `name-uses`      | Transalpina _olim_ Dacia Alpestris         |
| `nmu-dacia-transilvania-sambucus-1570` | `name-uses`      | Transylvania = Pannodacia, Dacia Ripensis  |
| `nue-dacia-province-*-1570` (3)        | `name-use-edges` | `revival` from `nmu-dacia-province`        |
| `att-0130` + `tr-0130`                 | `attestations`   | _Vlpia Traiana Zarmisgetusa_ beside Varhel |

All are `normalized`, the machine ceiling. `hw-late-maps` stays in the frozen
witness ledger; nothing requires a witness family to own a timeline state.

`att-0130` is filed against `plc-ulpia-traiana-sarmizegetusa`, **not**
`plc-sarmizegetusa-regia`. The plate names the Roman colonia beside its
contemporary Hungarian name; the Dacian royal seat lies forty kilometres away
and the places table warns about the conflation. `att-0006` carries the royal
seat from the 1595 Parergon and is a different claim.

## What review still has to settle

**1. Which copy.** These readings are from the Rumsey copy, filed against the new
`src-ortelius-theatrum-1570-rumsey`. `src-ortelius-theatrum-1570` still names LoC
`G3200m.GCT00126` and is left untouched as an unexamined lead. The two copies
have not been collated, and only the Rumsey record states a Koeman/Van der Krogt
variant.

**2. The image sequence.** Both LoC-derived records say "Hvngaria images 93-94";
in the Rumsey copy 94 is the _Transylvania_ text page. One of them is wrong and
nobody can say which without opening the LoC copy.

**3. The fate class and edge kinds are proposed, not reviewed.** `restitutio`
plus `revival` mirrors `nue-dacia-province-antiquarian`, the reviewed precedent
for Ortelius restoring the province name. But Dacia Ripensis was a late-Roman
province _south_ of the Danube, so Sambucus's equation may be a learned error
rather than a straight revival, and whether Trajanic Dacia is the referent being
revived for Transalpina is open. The lower `confidence` on
`nue-dacia-province-transalpina-1570` records that.

**4. One atlas copy cannot date the return.** These readings establish that Dacia
is in learned use in 1570; they do not establish when it re-entered use.

## Reviewer checklist

- [ ] Verify the readings against LoC `G3200m.GCT00126`, or accept the Rumsey
      substitution as the standing witness.
- [ ] Resolve the 93-96 image-sequence mismatch against whichever copy is cited.
- [ ] Confirm or change `fate_class` and the three `revival` edge kinds.
- [ ] Promote the `nmu-`, `nue-` and `att-` rows past `normalized` with a named
      reviewer once satisfied.
