# Crusades flagship: Phase 0 source and rights audit

Two bounded proofs share one audit in
[`data/crusades/source-audit.csv`](../../data/crusades/source-audit.csv):
Matthew Paris's itinerary from London to Apulia, and the Fourth Crusade's
Venice-Zara-Constantinople sequence. Nine sources, gated by
`npm run crusades:validate`, which also runs inside `npm run build`.

## The gap this audit keeps open

Knowing that a manuscript exists is not the same as having read the folio a
prototype means to use, and the distance between those two is where an
unverifiable claim gets in. So `locator` is required on every row and may be
`pending`, and a row claiming `verification_state: verified` may not leave it
pending. Today **every folio reference is pending**: the audit identifies the
witnesses and stops there.

A manuscript witness must carry its shelfmark or it is not identified, and the
validator refuses `n/a` for that kind.

## What is not cleared

**No source is cleared for publication.** That is a failure against KAN-384's
fourth criterion - "at least one usable Matthew Paris itinerary witness is
cleared for the intended presentation mode" - and it is recorded as a failure
rather than worked around.

The Parker Library's terms for the digitised Chronica Majora volumes could not
be read during this audit; the British Library's terms for Royal MS 14 C VII
were not read either. Neither licence is guessed at: both rows say
`rights_review_required` with `resolution_status: unverified`, and a production
role is refused unless rights permit reuse, a reproduction is resolved, and a
real locator exists.

The **fallback is real and sufficient**: Luard's Rolls Series edition is out of
copyright as a text, so the itinerary can be argued from the edition and a
redrawing rather than from a photograph of a manuscript nobody has licensed. The
prototype is therefore not blocked, only its imagery is.

## The sequence the Sea proof must be able to tell

`covers` is checked against seven stages, and the validator refuses a source set
that cannot reach one of them:

`intended_destination` · `fleet_contract` · `debt` · `zara` ·
`constantinople_1203` · `constantinople_1204` · `post_1204_claims`

The last stage is why the proof does not end in 1204. The _Partitio terrarum
imperii Romaniae_ divided an empire on parchment, and what was claimed there and
what was actually held are different maps.

Villehardouin touches every stage before that one, which is exactly why Robert
of Clari and Niketas Choniates are in the set. Villehardouin negotiated the
contract he describes; a sequence told only by its negotiators is not the
sequence, and the prototype has to surface that rather than smooth it over.

## Dealer imagery

Auction and aggregator listings are not publication sources, and the rule is
data rather than an instruction: a `repository_url` on a dealer or aggregator
host fails validation, so a later addition cannot forget it.

## The pilot place authority (KAN-385)

Twenty core places in [`data/crusades/places.csv`](../../data/crusades/places.csv),
fourteen carrying the Matthew Paris itinerary from London to Otranto and six
carrying the Fourth Crusade from the Venetian contract to Adrianople. Both
prototypes read this one table; neither keeps a copy.

**Modern coordinates are reference context and nothing else.** No source in
either proof gives a position - an itinerary counts days and a chronicle names
towns - so `coordinate_basis` accepts only `modern_reference`, and a row
claiming a source-given medieval position fails. The point of the constraint is
that the Road proof is about _duration_, not distance: Mont Cenis is a stage
where the itinerary's day-units stop meaning what they meant on the plain, and a
map that plots it as a point risks implying the opposite.

**A transliteration is a reading aid and never a replacement.** Constantinople's
Greek form is the city's own name and the Latin is the crusaders' - the
difference is much of what the Sea proof is about - so a row carrying a Greek
form must say in `script_note` how it stands to the Latin one. A core place with
neither a Latin nor a Greek form fails: without one it is a modern town with a
crusade attached to it.

One place carries two events. Constantinople was restored to an emperor in 1203
and sacked in 1204, and a single point cannot hold both: the interaction
distinguishes them by date rather than by place, which is why the row's window
spans them and its note says so.

Every row is `normalized`, not reviewed. The same promotion discipline applies
here as in the Dacia corpus - machine-compiled research stops short of review -
and KAN-385's criterion asks for _reviewed_ core places, so that part of the
ticket is outstanding rather than met.
