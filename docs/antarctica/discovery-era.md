# The discovery era, 1819 to 1843 (KAN-425)

The dataset for the period in which Antarctica stops being a hypothesis and
starts being a coastline, assembled so that it can describe the argument without
joining it.

Tables: `data/antarctica/priority-claims.csv`, `coastline-chronology.csv`, plus
the discovery-era rows in `expeditions.csv` and `observations.csv`.

## There is no discoverer field

The single most important thing about this dataset is a column it does not have.

Six priority claims are recorded across two contests. Each row says who claimed
what, on what date, **which definition of discovery it satisfies**, who asserts
it and what is held against it. No row says it wins, and the schema has no way
to express that it does. The validator refuses a contest with only one claimant,
because a single-claimant contest is a finding dressed up as an argument.

This is not neutrality for its own sake. The 1820 dispute is largely
definitional: Bellingshausen's claim is strong if an ice front observed from
close inshore counts, and empty if the definition requires rock; Bransfield's
answers a different definition three days later; Palmer's rests on a sealing log
ten months after that. Comparing the three dates settles nothing, and a data
model with a Boolean `is_first` would settle it by data entry.

A fourth row records the sealing masters who may have seen land earlier and kept
no public record. It has no date and no observation, which is the honest shape of
an argument from silence, and it exists so the contest cannot be presented as a
closed field of three.

## Four dates, any of which may be missing

The coastline chronology carries `first_claimed_date`, `first_observed_date`,
`first_charted_date` and `first_confirmed_date` for each segment. None is
required.

That matters most where a date is absent. The coast charted as Wilkes Land has a
claimed date and an empty observed date, and that gap is the whole of the Wilkes
problem stated in data. A schema that required one date to be inferred from the
other would hide the finding.

The validator enforces only what is logically necessary: a segment cannot be
charted before it was claimed, or confirmed before it was charted, and a segment
marked confirmed must say when. Everything else about the order is allowed.

Two rows are worth reading against each other. Victoria Land has all four dates
and is the shape a well-evidenced coast has. The great ice barrier has the same
four dates and is filed as `modified` rather than `confirmed`, because an ice
front is not a coastline and does not stay where it was charted. A chronology
that called it confirmed coast would be wrong in a way no later survey could fix.

## Positions

Every discovery-era position here is approximate, recorded from the general
literature, and sits at `raw` with a pending locator. Several are recorded to the
month rather than the day on purpose: the exact days of the January 1840 sightings
are part of the dispute between Wilkes and d'Urville, and pinning them here would
resolve that dispute in a spreadsheet.

## What is still missing

Three expeditions charted overlapping coast in the 1840 season and only one of
their charts is located in a named holding. Until the French and British atlas
plates are found, Act V can describe the competition but cannot show it.

Note also a disagreement the data now carries rather than smooths: both cumulative
ice charts date Wilkes and d'Urville to 1839, while the narratives put the coast
sightings in January 1840. A chart disagreeing with its own sources is evidence
about the chart.
