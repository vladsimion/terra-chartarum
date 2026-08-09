# Browser, accessibility and performance support contract

KAN-380 turns the existing Playwright, axe and Lighthouse setup into a release
contract. Machine-readable versions and budgets live in the `support` section of
[`data/contracts/terra-chartarum.json`](../../data/contracts/terra-chartarum.json).

## Supported test matrix

The minimum automated versions are the browser revisions pinned by Playwright
1.61.1 and `package-lock.json`:

| Project         | Surface            | Minimum tested engine  | Required scope                                |
| --------------- | ------------------ | ---------------------- | --------------------------------------------- |
| `chromium`      | Desktop Chrome     | Chromium 149.0.7827.55 | Full smoke, keyboard, axe and core-flow suite |
| `firefox`       | Desktop Firefox    | Firefox 151.0          | Core flows                                    |
| `webkit`        | Desktop Safari     | WebKit 26.5            | Core flows                                    |
| `mobile-chrome` | Pixel 5 viewport   | Chromium 149.0.7827.55 | Core flows and responsive behavior            |
| `mobile-safari` | iPhone 13 viewport | WebKit 26.5            | Core flows and responsive behavior            |

The contract follows the pinned CI engines, not an evergreen claim that an
untested future browser is supported. Upgrade Playwright and this matrix in the
same change. Manual release QA covers the current stable Chrome, Firefox and
Safari when their behavior differs materially from the pinned engine.

## Performance budgets

All numbers are Lighthouse navigation budgets under the desktop preset. They are
hard failures except the one Atlas score noted below.

| Metric                   | Content/non-Atlas |           Atlas |
| ------------------------ | ----------------: | --------------: |
| Performance score        |           >= 0.90 | >= 0.80 warning |
| Accessibility score      |           >= 0.95 |         >= 0.95 |
| Best-practices score     |           >= 0.90 |         >= 0.90 |
| SEO score                |           >= 0.90 |         >= 0.90 |
| Largest Contentful Paint |       <= 2,500 ms |     <= 2,500 ms |
| Cumulative Layout Shift  |           <= 0.10 |         <= 0.10 |
| Total Blocking Time      |         <= 200 ms |     <= 1,000 ms |
| Total transferred bytes  |      <= 1,250,000 |    <= 1,500,000 |
| Transferred script bytes |        <= 200,000 |      <= 350,000 |

The Atlas score alone is a warning because MapLibre is an intentional above-fold
WebGL dependency and shared CI runners make its aggregate score noisy. This does
not weaken its accessibility, LCP, CLS, blocking-time or transfer budgets; those
remain errors. `lighthouserc.json` is the executable form.

## Reusable interaction gates

Every new interaction identifies its applicable route profile (`content` or
`atlas`) and demonstrates:

- complete keyboard operation with visible focus and sensible focus order;
- equivalent touch and pointer operation without hover-only information;
- responsive behavior at the two mobile projects and desktop widths;
- a readable `prefers-reduced-motion` state;
- a text equivalent and no meaning carried by colour alone; and
- no WCAG A/AA violations in the existing axe suite.

The pull-request template records this declaration. A new island cannot ship by
calling itself decorative if it communicates evidence, state or navigation.

## Atlas, IIIF and DeepZoom fallbacks

Atlas keeps its existing grouped-list fallback when WebGL is unavailable. Layer
controls that require WebGL become unavailable without hiding the corpus or its
links.

DeepZoom is progressive enhancement:

1. The initial surface is a rights-cleared static image with alt text,
   attribution and source/citation access.
2. OpenSeadragon loads only after the reader requests zoom.
3. Unsupported browser, network, IIIF or tile failure retains/restores the
   static image; the viewer may never become an empty rectangle.
4. Low-resource users can read and cite the work without initializing tiles.

## Tool mapping

- `playwright.config.ts` owns the browser/device matrix.
- `e2e/flows.spec.ts` owns browser-agnostic pointer/touch/responsive flows.
- Chromium smoke and specialist suites own keyboard and axe checks.
- `lighthouserc.json` owns route budgets; `scripts/lighthouse.mjs` supplies a
  local Chrome fallback.
- `.github/workflows/ci.yml` installs every supported engine and runs the gates.
