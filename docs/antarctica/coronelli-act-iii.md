# Coronelli at the edge of the known world (KAN-422)

Act III's research package: what has been established, what has not, and what the
act now argues.

Tables: `data/antarctica/coronelli-lineage.csv`, `coronelli-annotations.csv`,
plus the Coronelli rows in `sources.csv` and `map-objects.csv`.

## What is established

The plate has been seen. It is `Terre Artiche`, David Rumsey list no. 12186.101,
in _Atlante Veneto_ Tomo I: an atlas map, 46 × 61 cm, scale 1:12,200,000,
examined at full IIIF resolution on 2026-08-25. It is Arctic to the neatline.

The polar section around it runs Rumsey 12186.100 to .107 and is structured as
follows: six text leaves headed `Terre Polari, Artiche, ed Antartiche`, two
engraved plates, `Terre Artiche` (.101) and `Polo Artiche` (.104), both
classified Arctic, and then the section closes into `Idrografia` at .108.

No southern polar plate was cut for this sequence. The heading promises both
poles; the copperplates deliver one.

The plate carries a dedication cartouche, set in a wreath of cloud-forms and
wind-putti: `TERRE ARTICHE, descritte Dal P. M. Coronelli M. C., Cosmografo
della Sereniss. Republica di Venetia, Dedicate All'Ill.mo et Ecc.mo Sig. Conte
Ercole Pepoli, Conte di Castiglione, Bragazza, Sparui, etc., Senatore di
Bologna, Nobile Ferarese e Patritio Veneto.` This is a dedicated commercial
object, not a private statement of belief.

At the pole itself, where the Mercator generation drew four islands around a
polar rock, Coronelli engraves a ring of mountains enclosing a block of text.
That text is a voyage register. It records Hugh Willoughby (`Vgone Willogheo`),
English, at latitude 76°; a party of seven sent to overwinter at Spitsbergen to
certify whether the China passage could be run in a better season, which sailed
30 August 1633 and returned `senz'alcun profitto` on 26 May 1634, with a note of
death from cold; and Friedrich Martens of Hamburg, who left the Elbe on 15 April
1671, pushed through ice and immense cold toward Spitsbergen, and returned to the
same river on 21 August of the same year having reached 81°.

Every fact in that legend is _reported_: Coronelli relaying other men's voyages,
with names, dates and latitudes attached, and a commercial motive behind them.
None of it is inherited cosmography and none is his own observation.

## The finding

The act inverts, as the previous audit anticipated, and it improves.

The interesting thing about a comprehensive late-seventeenth-century cosmographer
is not what he invented in the far south. It is how little he had to say about it
next to a north where there were names, dates and tracks to engrave. The
asymmetry is not a claim about Coronelli's beliefs; it is visible in the
structure of his own section and in the density of his own annotation. He was
engraving for a patron, and the north was where the evidence was.

The globe is where this gets decided. A sheet map can decline to cut a southern
plate. A globe cannot leave a hole in the southern calotte, so whatever Coronelli
engraved there under that constraint is the better question, and it remains
unanswered, because no gore set has been examined.

## What is not established

Which work the sequence belongs to. Rumsey's publication 12186 is titled
_Atlante Veneto_ ... _Tomo I. In Venetia MDCXCI_, that is 1691, while its Pub Date
field reads 1693. Whether the polar leaves belong to Tomo I, to the _Epitome
Cosmografica_ of 1693, or to both, is open (`ant-gap-atlante-epitome-attribution`).
A Gallica identifier offered for the Epitome, ark `bpt6k106268x`, did not resolve
and is not recorded as a locator.

The text. The polar leaves are located but untranscribed, so the plate and the
text still cannot be read together as the ticket requires.

The rest of the Atlante Veneto. Tomo I carries no southern polar plate; the other
twelve volumes and the _Libro dei Globi_ have not been audited. Four candidate
plates are proposed for that audit, of which only the western `America
Meridionale` sheet (12186.097) is confirmed to exist
(`ant-gap-atlante-plates`).

The globe. No catalogued gore set has been opened and the southern calotte has
not been examined (`ant-gap-coronelli-gores`). Every lineage question against
Mercator and Ortelius stays blocked on this.

Milanesi. Still unconsulted, and now with a specific question to answer: what
Pepoli's patronage and the Frari workshop's practice mean for how this plate
should be read (`ant-gap-coronelli-milanesi`).

## A correction

The object register previously held `ant-obj-coronelli-terre-polari`, described
as a plate titled `Terre Polari, Artiche, ed Antartiche` in the _Epitome
Cosmografica_. Its `persistent_id` resolved to Rumsey 1012.002, a plate from the
1929 _Atlante internazionale del Touring Club Italiano_. No Coronelli map plate
of that title exists in the Rumsey catalogue; the title belongs to text leaves.
The row has been replaced by `ant-obj-coronelli-terre-artiche` (verified) and
`ant-obj-coronelli-polo-artiche` (catalogue record read, plate not examined).

## The annotation plan

Five steps. Three now have specified IIIF regions on
`RUMSEY~8~1~303154~90060722` (full image 12365 × 7744): the plate entire, the
central polar legend at `5000,2350,2350,1200`, and the dedication cartouche at
`1620,650,1920,2160`.

The cartouche step replaces the former "southern polar region" step, which
assumed a southern half this plate does not have. The absence is now carried by
the text-sequence step instead of by a crop that cannot be taken.

Two steps keep unresolved regions: the globe's southern calotte, blocked on the
gore set, and the text leaves, located but untranscribed.

One caveat on the plate itself: it is imaged in the bound volume and the gutter
falls through the pole, so the central legend sits on the fold. Any DeepZoom
target on the polar region has to account for that or specify a different copy.

## What would unblock the rest

In order: locate a catalogued Coronelli gore set with the southern calotte imaged;
settle the Atlante Veneto / Epitome attribution against a collated copy;
transcribe the six polar text leaves; acquire Milanesi; audit the remaining
Atlante Veneto volumes for any southern polar plate.
