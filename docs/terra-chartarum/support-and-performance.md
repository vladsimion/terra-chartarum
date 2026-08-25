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

### Archival plates on a budgeted route

Every content route holds the 1,250,000-byte ceiling, including
`/essays/cities-remember/`, which carries three large images as its argument: the
1920x1185 Nolli sheet (1,209,518 bytes), the Nuremberg chronicle view (472,412)
and the modern Rome basemap (778,760). Serving those at archival size put the
route at 2,173,970 bytes once the full-width editorial layout (#127) brought them
inside Chrome's lazy-load horizon.

They are not re-encoded in place, and the sheet is not resized. Its 1920x1185
frame is the pixel space the four overlay control points are stated in;
`geo:interop:validate` asserts that frame against the file on disk, and the
published annotation names the file's own URL as `target.source.id`. Shrinking it
would silently invalidate a georeference other people can download.

Instead `scripts/build-plate-derivatives.mjs` writes a ladder of display-sized
rungs into `public/images/cities-remember/display/`, and the essay and
`CityMemoryOverlay` request the rung that matches the box each image occupies.
The canonical plates stay byte-for-byte unchanged beside the ladder, and the
overlay's **Full plate** control loads the sheet on request - so the detail the
overlay invites readers to inspect is deferred, not removed. The route now
measures 1,173,482 bytes and needs no exception.

Two cheaper options were measured and rejected. Re-encoding in place buys too
little on engraved linework (1181 -> 829 KiB at mozjpeg q82; WebP is worse at 984) and costs detail everywhere rather than only where nobody is looking.
Backing the overlay with DeepZoom tiles costs _more_, not less: a DZI pyramid of
the sheet is 66 tiles and 1,552 KiB against the 1,181 KiB single file, its 1:1
level alone is 1,140 KiB, and OpenSeadragon adds ~400 KiB of script before the
first tile. A pyramid defers pixels only when the master is far larger than the
viewport; at 1920x1185 the top level is the whole image, so there is nothing to
defer. `scripts/build-map-tiles.mjs` remains the right tool for scans that are.

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
