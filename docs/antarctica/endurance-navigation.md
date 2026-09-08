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

Every published position resolves to a source and carries a review status. The
drift-year positions are still `raw` with pending locators. The boat journey no
longer is: its positions were read out of the log in August 2026 and are
`normalized`, which means read against the source and not yet reviewed by a
person.

The evidence classes do the work. An `instrumental_fix` is a position from an
observation and a timekeeper. `dead_reckoning` is a position the navigator
inferred at the time from course, speed and elapsed time, and it is historical
evidence. `editorial_interpolation` is a line we drew between two records, and it
is not evidence of anything except our drawing.

## The James Caird, day by day

The boat journey used to be three points with a middle point that was ours
entirely, filed as interpolation and present only to prove the schema could carry
a boat journey. It is now the log.

Bergman, Huxtable, Morris and Stuart transcribed the whole of Worsley's
navigational log for the passage and replicated every calculation in it (_Records
of the Canterbury Museum_ 32: 23-66, 2018) - the companion, in the same volume,
to the Weddell Sea paper that closed `ant-gap-worsley-workings`. Their Appendix B
labels each day's noon position as reckoned or observed, which is what makes the
distinction assignable row by row rather than in a caption.

Nineteen positions are now in `observations.csv`, covering the fourteen days from
25 April to 8 May 1916. Five are corrected by sights; the rest are reckoned. On
the five days that have both, both rows are kept, because the difference between
them is the evidence:

| Date          | Reckoned         | Observed         | Apart     |
| ------------- | ---------------- | ---------------- | --------- |
| 26 April 1916 | 58 42 S, 52 17 W | 59 46 S, 50 48 W | 78.5 n.m. |
| 29 April 1916 | 58 42 S, 48 40 W | 58 38 S, 50 00 W | 41.8 n.m. |
| 3 May 1916    | 55 53 S, 44 53 W | 56 13 S, 45 38 W | 32.1 n.m. |
| 4 May 1916    | 55 23 S, 44 10 W | 55 31 S, 44 43 W | 20.4 n.m. |
| 7 May 1916    | 54 23 S, 39 40 W | 54 38 S, 39 36 W | 15.2 n.m. |

The separations are ours, computed from the two positions the log gives; the
paper draws no such comparison. Read down the column and the passage gets less
uncertain as it goes, which is what a navigator correcting a reckoning with every
sight he can take should look like.

The 26 April pair is the act's argument in two rows. Worsley reckoned a run of
N45E 110 miles and the sights put the boat some seventy-eight nautical miles from
where the reckoning had it - far enough south and east that every position after
it descends from the correction rather than from the reckoning. A test asserts
the separation, so the day cannot quietly be merged into one position.

The track is now `derived_from_log` rather than `editorial_interpolation`:
fifteen vertices, the departure position and each day's accepted noon position,
with the observed one taken on a day that has both because that is the position
Worsley ran the next day from. Its evidence class is `dead_reckoning`, not
`instrumental_fix`, because nine of the fourteen noons are reckoned and filing
the whole line as observed would overclaim them. A test asserts the vertices are
exactly those rows, so the line and the table cannot come to describe different
passages.

Two things the line still cannot say. A noon-to-noon track says nothing about the
path between two noons. And it ends on 8 May, the last position the log works;
the landing in King Haakon Sound two days later has no position in the log at
all, and the last entry of the passage - a noon sight on 13 May from the cove -
gives a latitude of 54 10 47 S and no longitude, so it is recorded in prose
rather than as a point.

The departure position is worth its own note. Worsley took his departure from
Wild Camp using 61 04 S, 54 50 W for Cape Belsham, a position read off a
1:8,000,000 chartlet in Nordenskjold and Andersson (1905), which took it from
Fricker (1898) and in turn from Stieler's atlas of 1891. A time sight taken at
the camp that morning gave a different longitude, and he did not adopt it,
because the longitude of the cape was only approximately known. The boat journey
therefore begins on inherited cartography, which is why the row is filed as
`inherited_cartography` and not as a fix - the essay's subject turning up in its
own dataset, at the first number of the passage.

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
are opened, this project publishes no error figure and no envelope. The two
Canterbury Museum papers - the drift year and the boat journey - are open access
and have both been read; the two Journal of Navigation papers, which are the ones
carrying the uncertainty, are behind a paywall and have not.

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
