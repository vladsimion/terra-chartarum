---
id: layer-dacia-treaty-frontiers
title: 'Treaty frontiers, 1829-1947'
summary: What each settlement moved, drawn as dated phases - and every line editorial, because not one instrument in the ledger supplies geometry this project could use.
docType: layer
pattern: B
programme: dacia
layerId: dacia-treaty-frontiers
lifecycle: published
lastReviewed: '2026-08-23'
referencesDocIds:
  - evidence-dacia-treaty-frontiers
  - method-dacia-shared-gis
  - data-fields-dacia
relatedLayerIds:
  - dacia-principalities
  - ne-boundaries
relatedCollectionIds:
  - corpus-chartarum-daciae
relatedEssaySlugs:
  - dacia
citation:
  version: 'dacia-treaty-frontiers-kan352'
  licence: 'CC BY 4.0'
technicalLinks:
  - label: Treaty frontier source ledger
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/dacia/treaty-frontier-source-ledger.md'
  - label: Shared GIS methodology
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/dacia/shared-gis-layers.md'
  - label: Compiled phases
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/data/dacia/gis/treaty-frontier.csv'
  - label: Release manifest
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/public/geo/manifest.json'
---

## What you are looking at

Eight lines across seven phases, showing where the frontiers of the Romanian
lands stood after each settlement between the Treaty of Adrianople in 1829 and
the Paris Peace Treaty of 1947. Move the year slider and the map shows the
arrangement in force at that moment.

Every line on this layer was drawn by this project. None of them is a digitised
boundary.

## How to read this layer

Three kinds of line, told apart without relying on colour:

| Line           | Appearance     | What it is                                        |
| -------------- | -------------- | ------------------------------------------------- |
| Treaty line    | solid, heavy   | A frontier an instrument actually fixed.          |
| Reconstruction | dashed, medium | A later scholarly redrawing of where it ran.      |
| Proposal       | dotted, thin   | A line somebody put forward that was not adopted. |

Weight and dash carry the distinction so it survives for readers who do not see
the hues, and so a printed screenshot keeps its meaning.

Where two sources give different lines for one moment, **both are kept**. They
are not averaged. An averaged frontier would be a line nobody proposed,
presented with more confidence than either source earns.

## The gap this layer exists to make visible

A treaty can settle a frontier completely and still give you nothing to draw.

The instruments in the ledger say things like "the Pruth shall form the
boundary" or "the frontier shall follow the line laid down by the Commission" -
legally sufficient, cartographically empty. The delimitation commissions that
turned those words into ground truth produced protocols and maps this project
has not obtained, and in several cases which may not survive.

So the evidence for **where a frontier was** and the geometry **showing where it
ran** come from different places, and this layer keeps them apart. The ledger
records what each instrument establishes. The line records what this project
drew in order to show it. Nothing here should be read as a delimitation.

## Historical scope

1829 to 1947, as seven dated phases. Each feature carries its own validity
range, so the year slider reveals and hides individual lines rather than the
whole layer: at 1860 you see the post-Adrianople arrangement, at 1920 the
Trianon settlement, and the intervening proposals appear only in the years they
were live.

## Sources and evidence

The full instrument-by-instrument ledger is published as
[the treaty and frontier source ledger](/atlas/handbook/evidence/dacia-treaty-frontiers/).
For each instrument it records the date, the source and locator, what the
evidence establishes, what it does not establish, the geometry provenance and
the confidence and review state.

The short version: the instruments are cited from Hertslet's _The Map of Europe
by Treaty_ and the standard treaty series. Confidence attaches to the _fact_ of
the settlement, which is generally high - these are published international
instruments. It does not attach to the linework, which is editorial in every
case.

## Reconstruction and uncertainty

Three things are uncertain here and the layer is explicit about each.

**The line's position.** Drawn from the instrument's description and from
published small-scale maps. In river sections it is defensible to within the
river; across plains and mountains it is indicative.

**Which line was in force.** Some settlements were signed, modified and
ratified across several years. The phase dates follow the instrument that fixed
the arrangement, not the ratification, and the ledger records where those differ.

**Whether a proposal mattered.** A proposal is kept because a rejected frontier
is evidence about what was thought possible at the time. Keeping it is not a
claim that it was ever close to adoption.

## Editorial decisions

**Editorial lines are never presented as source geometry.** Every feature
carries `geometry_provenance: editorial_reconstruction`, and the dash pattern
shows it on the map without the reader having to open a panel.

**Competing lines are retained rather than resolved.** Disclosure over
tidiness: a map that shows one line where the sources give two has made a
scholarly decision silently.

**Modern boundaries are available as context and labelled as anachronism.**
Comparing a 1913 frontier with today's border is a legitimate thing to want; the
[modern boundaries layer](/atlas/layers/ne-boundaries/) exists for it and says
what it is.

## Data fields

`line_type`, `interpretation_status`, `confidence`, `source_id` and
`review_status` are all filterable on the map. Their meanings are in
[the Dacia data fields](/atlas/handbook/data-fields/dacia/); the shared geometry
rule behind them is in
[the shared Dacia GIS method](/atlas/handbook/methods/dacia-shared-gis/).

## Data and downloads

Served as GeoJSON under CC BY 4.0 from the content-addressed release, so a given
URL always returns the same bytes. Attribution: _Terra Chartarum; instruments
after Hertslet and the KAN-351 source ledger; all linework editorial._ That last
clause must travel with any reuse.
