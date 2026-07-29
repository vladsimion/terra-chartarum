# VMN-31 — winds, currents and shipping-distance source hunt

Decision: **no-go for a medieval route-cost layer; conditional go for a clearly
labelled climate-model context experiment only.**

No searched source provides observed or reconstructed, navigation-scale
Mediterranean winds, currents and sea state for c.1400. Modern reanalyses are
well licensed and technically excellent, but using them as medieval conditions
would make a false temporal claim. Last-millennium simulations reach the period,
but are coarse, free-running climate-model output rather than weather
reconstruction or evidence of historical voyage duration.

## Candidates reviewed

| Candidate                                                                                                                                              | Coverage / variables                                                                                   | Licence                                                                          | Fitness                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [Copernicus Mediterranean Physics Reanalysis](https://data.marine.copernicus.eu/product/MEDSEA_MULTIYEAR_PHY_006_004/description)                      | 1987–present; hourly/daily/monthly currents at about 4–5 km                                            | Copernicus terms; attribution required                                           | Excellent modern current baseline; temporally invalid for c.1400                                      |
| [Copernicus Mediterranean Waves Reanalysis](https://data.marine.copernicus.eu/product/MEDSEA_MULTIYEAR_WAV_006_012/description)                        | 1985–present; hourly wave and Stokes-drift fields at 1/24°                                             | Copernicus terms; attribution required                                           | Excellent modern sea-state baseline; temporally invalid                                               |
| [ERA5 single levels](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels)                                                         | 1940–present; hourly 10 m wind and wave variables                                                      | CC BY 4.0                                                                        | Licensable, but no medieval inference                                                                 |
| [PMIP4 past1000 design](https://pmip4.lsce.ipsl.fr/doku.php/exp_design:lm) and [CMIP6 access guide](https://pcmdi.llnl.gov/CMIP6/Guide/dataUsers.html) | Free-running last-millennium coupled-model output, beginning 850 CE; model-dependent wind/ocean fields | CMIP6 model output is CC BY 4.0 with model citation/acknowledgement requirements | Period overlaps, but resolution/uncertainty are unsuitable for route geometry or shipping-time claims |
| [NOAA Last Millennium Reanalysis v2](https://www.ncei.noaa.gov/metadata/geoportal/rest/metadata/item/noaa-recon-27850/html)                            | Global annual climate reconstruction, 0–2000 CE                                                        | Public NOAA distribution; citation required                                      | Useful climate context; not navigation-scale wind/current or hourly sea state                         |

## Guardrail

Do not add a wind, current or shipping-distance Atlas layer from these sources.
A future, separately reviewed experiment may compare the authored routes with a
multi-model PMIP4 wind climatology if it:

1. uses an ensemble rather than one model;
2. exposes model, variable, grid, version, licence and uncertainty;
3. labels the result “modelled climate context”, never reconstructed voyages;
4. avoids converting model wind/current into historical journey times without
   a published, vessel-specific method and independent validation.

Re-open the build only if a peer-reviewed, reusable dataset meets those four
conditions at Mediterranean routing scale.
