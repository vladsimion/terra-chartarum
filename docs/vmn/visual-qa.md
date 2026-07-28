# VMN visual QA protocol

Run the scripted scrub before changing a VMN layer from pending to live and before each
subsequent data release:

```sh
npm run test:vmn-visual
```

The Chromium run opens all three VMN layers, checks six representative years at three
map zooms, and attaches 18 PNG frames to the Playwright HTML report. CI archives that
report for seven days on every pull request and `main` push.

## Scripted matrix

| Slider years | Why                                                |
| ------------ | -------------------------------------------------- |
| 1204 · 1261  | Fourth-Crusade and post-Latin-Empire states        |
| 1409 · 1453  | Dalmatian consolidation and fall of Constantinople |
| 1500 · 1797  | Morean-route break and final Republic state        |

The three zooms are regional (`2`), network (`4`) and harbour (`6`).

## Manual release checklist

- [ ] All three toggles enable and load without a browser error.
- [ ] Ports appear at plausible harbour positions and change with the year.
- [ ] The selected port popup uses the phase valid at the requested year.
- [ ] The requested route is visibly emphasized and follows its ordered waypoints.
- [ ] Possession fills stay on land and do not bridge obvious sea gaps.
- [ ] Line and fill styling remains legible over the base map at zooms 2, 4 and 6.
- [ ] Region filtering composes with the year slider.
- [ ] The 18 attached frames have been compared with the previous release artifact.
- [ ] `make vmn-validate`, unit tests, type-check, lint and production build are green.
- [ ] The release commit and any accepted visual differences are recorded in Jira.
