# Hanseatic essay release

- Release date: 8 August 2026
- Release identifier: `hse-d383ae6dff5e3825`
- Essay: `/essays/the-league-that-left-no-map/`
- Tickets: KAN-312–315, KAN-300 and KAN-301

## Publication contents

- A native 5,805-word, nine-section essay with Road as its primary room and City and Archive as secondary rooms.
- Five generated-data interactives, four Kontor dossiers, one Venice–Hanseatic comparison and a static evidence ledger.
- Eight published map/city witnesses with complete repository and public-domain rights metadata.
- Four reference-only documentary witnesses whose images are not republished.
- Linked Olaus Magnus and Georg Braun cartographer records, plus four research bibliography entries.
- SVG cover and 1200 × 630 raster Open Graph card.

## Historical and rights review

The publication distinguishes generalized analytical reconstructions from historical maps, avoids a synthetic membership boundary, retains disputed or conventional dates as such, and keeps VMN and HSE inputs separate. Each published witness records repository, object identifier, source URL, attribution and rights statement. Documentary objects without a cleared surrogate remain metadata-only.

## QA record

All production gates passed:

- Astro check: 0 errors.
- Vitest: 199 tests passed.
- HSE Python promotion suite: 55 tests passed.
- HSE data validator: 8/8 witnesses, 36/36 high-importance claim locators, 4/4 reviewed Kontore, 60 places, seven corridors and 16 events.
- Production build: 107 pages, with search, sitemap, reports and geo-interoperability checks passing.
- Playwright: five HSE release tests passed across native rendering, keyboard/reduced-motion behavior, axe WCAG A/AA, internal links, and desktop/mobile screenshot scrubs.
- Lighthouse: HSE performance 100; comparable `cities-remember` performance 100; regression 0 points. Accessibility, best practices and SEO also scored 100 for the HSE essay. The Atlas retained its pre-existing non-blocking performance warning at 78.

The machine-readable source of truth is `data/release/hanseatic.json`.

## Post-publication checks

- [x] Canonical essay route renders the native MDX body.
- [x] Search includes the essay, HSE catalogue objects and cartographers.
- [x] Road, City and Archive room surfaces link to the essay and sections.
- [x] Bibliography exposes every merged HSE research source.
- [x] Catalogue and cartographer routes resolve for all eight witnesses.
- [x] Claim-ledger and Atlas deep links resolve.
