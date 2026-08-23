# Endurance: navigation, drift and uncertainty (KAN-428)

Act VIII treats the Imperial Trans-Antarctic Expedition as a navigation problem
rather than a survival story. The dataset is built so the difference between
being steered, being carried, and being drawn by us is a property of the records.

Tables: `data/antarctica/expedition-phases.csv`, plus the Endurance rows in
`tracks.csv` and `observations.csv`.

## Nine phases, and one that never happened

The phases run: the announced crossing, the approach, the besetment, the drift,
the abandonment, the camps on the floe, the boat journey to Elephant Island, the
James Caird passage, and the crossing of South Georgia on foot.

The announced crossing is sequence 0. It is filed as `editorial_interpolation`
and its `under_own_power` is `planned`, which is neither yes nor no, because the
route was never sailed and our drawing of it is ours. The validator enforces both,
so a plan can never be promoted into evidence and the contrast Act VIII is built
on can never become a contrast between two things we drew.

The drift is enforced the other way: `under_own_power` must be `no`. A drift
rendered as a voyage would make the act's central question invisible, and the
question is the whole point. For nine months the ship's position changed
continuously while nobody steered anything.

Abandonment and sinking are twenty-five days apart and are two rows, not one.

## Positions and their methods

Every published position resolves to a source and carries a review status, and
every one of them is currently `raw` with a pending locator.

The evidence classes do the work. An `instrumental_fix` is a position from an
observation and a timekeeper. `dead_reckoning` is a position the navigator
inferred at the time from course, speed and elapsed time, and it is historical
evidence. `editorial_interpolation` is a line we drew between two records, and it
is not evidence of anything except our drawing.

The James Caird track is filed as interpolation in its entirety, because its
middle point is ours. A smooth line between two endpoints is the opposite of what
this act is about, and it is present only to prove the schema can carry a boat
journey. ANT-10 replaces it with Worsley's fixes.

## The sinking position

Bergman and Stuart reanalysed Worsley's theodolite and sextant observations from
his logbook and report 68 degrees 39 minutes 30 seconds south, 52 degrees 26
minutes 30 seconds west (_The Journal of Navigation_, September 2018).

Two things follow. The coordinate now has a reviewed source rather than a
published narrative behind it. And the logbook is reachable through the
literature rather than only through an archive visit, which turns
`ant-gap-worsley-workings` from a blocker into a reading task.

The article has not been read. Neither has its companion on chronometer error,
which is the source any published uncertainty figure must come from. Until both
are opened, this project publishes no error figure and no envelope.

## 1915 and 2022 stay apart

The reported sinking position and the wreck position are separate terms in the
terminology table and separate records in the data. Reporting seen during the
audit used one set of coordinates for both and then quoted a distance between
them, which cannot all be true.

The Coda's comparison is held until both coordinates and their uncertainties are
read from citable sources. What the act can already say without either figure is
the thing it most wants to say: a coordinate is a result produced by instruments,
observations, assumptions and calculation, not a fact that was simply recorded.

## An unresolved date

Sources seen during compilation give the besetment as both 18 and 19 January 1915.
The dataset records 19 January and logs the disagreement as
`ant-gap-besetment-date` rather than choosing quietly. It is the first date in a
dated dataset and everything else is measured from it.
