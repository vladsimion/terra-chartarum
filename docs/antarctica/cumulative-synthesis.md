# The cumulative chart and its revision (KAN-427)

Act VII's claim is that cartography is a layered archive. Two Greenwich catalogue
records turn that from a metaphor into evidence.

Table: `data/antarctica/chart-contributions.csv`.

## Two sheets, one compilation

|           | 1874 sheet                                                 | 1910 sheet                                                   |
| --------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| Object ID | NTY288:1/2(1)                                              | G288:1/2(2)                                                  |
| Creators  | HM Admiralty; Robert Christopher Carrington; Malby and Son | United Kingdom Hydrographic Office; Carrington; Thomas Malby |
| Dated     | 1874 compiled, 1879 published                              | 1910; 1874                                                   |
| Extent    | Polar projection to 30 degrees south                       | ca. 1:4 000 000                                              |
| Credit    | Crown copyright, National Maritime Museum                  | Crown copyright, National Maritime Museum                    |

Both catalogue records were read directly. Both titles enumerate the voyages
compiled, and the two lists differ.

The 1874 title runs Cook 1772-5, Bellinghausen 1819-21, Weddell 1822-4, Foster
1828-9, Biscoe 1830-2, Balleny 1839, D'Urville 1839, Wilkes 1839 and Ross
1841-2-3, and adds Towson's papers on icebergs in the Southern Ocean, 1855-59.

The 1910 title carries the same voyages and adds **Scott 1901-4** and
**Shackleton 1908-9**. Towson is gone.

That is the finding. A cumulative chart is not a summary of everything known: it
is a dated state that gets revised, and here the revision is legible from two
titles without opening either sheet.

## What the table records

Twelve contributions, each carrying which sheet it appears on. `chartRevision()`
partitions them into retained, added and dropped, and the validator refuses the
dataset if the 1910 sheet does not compile more than the 1874 one, because Act VII
rests on that inequality and a table that lost it would be decoration.

Towson is the most interesting row: a set of papers on icebergs, credited on the
earlier sheet and absent from the later one. It is the only contribution here
that never went south, and a compilation that cites an analysis rather than an
observation is exactly the difference between surveyed and reconciled geography.

## Two things the titles do not tell us

**What each voyage contributed, and where.** A title says which voyages were
compiled. The annotated view needs to know what appears on the sheet and in which
part of it, and that requires reproductions of both charts
(`ant-gap-chart-contribution-basis`).

**Why the chart dates disagree with the narratives.** Both sheets date Wilkes and
d'Urville to 1839, while the accounts put the coast sightings in January 1840.
That is recorded as the chart gives it rather than corrected silently: a chart
disagreeing with its own sources is evidence about the chart.

## Heroic Age selection

Scott and Shackleton are here because the 1910 chart's own title names them, which
is a cartographic reason rather than a famous one. Mill's 1905 synthesis is held
as a textual comparator for the same reason: it shows what a well-informed reader
could know five years before the sheet that revises it.

Belgica and Mawson are held as candidates and will be cut unless the act can show
what their survey work added to a map. Mawson postdates the 1910 chart entirely,
so his value to Act VII is as evidence of what the chart already needed revising
for.
