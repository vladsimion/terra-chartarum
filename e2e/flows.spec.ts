import { test, expect } from '@playwright/test';

// Core user flows (KAN-54 / ATLAS-603). These run on every engine in the
// Playwright config - Chromium, Firefox, WebKit - and on two mobile viewports
// (Pixel 5, iPhone 13), so they double as the cross-browser / responsive QA
// gate. They are deliberately click- and value-driven (no keyboard-focus
// assertions, which are engine-specific and covered chromium-only in
// smoke.spec.ts) and make no assumptions about the exact essay count.

test.describe('flow: primary navigation', () => {
  test('header nav reaches Essays, Rooms and Atlas from the home page', async ({ page }) => {
    await page.goto('/');

    // The primary nav is present and usable at every viewport (it reflows rather
    // than collapsing into a menu, so the links stay directly clickable).
    const nav = page.getByRole('navigation', { name: 'Primary' });
    await expect(nav).toBeVisible();

    await nav.getByRole('link', { name: 'Essays' }).click();
    await page.waitForURL(/\/essays\/?$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Visual essays' })).toBeVisible();

    await nav.getByRole('link', { name: 'Rooms' }).click();
    await page.waitForURL(/\/rooms\/?$/);
    await expect(page.getByRole('heading', { level: 1, name: 'The Seven Rooms' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Rooms' })).toHaveAttribute('aria-current', 'page');

    await page.goto('/rooms/city/');
    await expect(nav.getByRole('link', { name: 'Rooms' })).toHaveAttribute('aria-current', 'page');

    await nav.getByRole('link', { name: 'Atlas' }).click();
    await page.waitForURL(/\/atlas\/?$/);
    await expect(page.locator('h1').first()).toBeVisible();

    // The brand mark returns to the home page.
    await page.getByRole('link', { name: 'Terra Chartarum - home' }).click();
    await page.waitForURL(/\/$/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('every primary link is on screen without a horizontal scroll (KAN-65)', async ({ page }) => {
    await page.goto('/');

    const nav = page.getByRole('navigation', { name: 'Primary' });
    const links = nav.getByRole('link');
    await expect(links).toHaveCount(7);

    // The nav used to sit in an overflow-x box with the scrollbar hidden, so the
    // last items (About, Colophon) were off screen with no affordance. It now
    // shrinks and wraps instead: nothing scrolls, everything is clickable.
    const overflow = await nav.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(pageOverflow).toBeLessThanOrEqual(1);

    const viewport = page.viewportSize();
    for (const link of await links.all()) {
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual((viewport?.width ?? 0) + 1);
    }
  });
});

test.describe('flow: gallery → essay', () => {
  test('opening an essay card lands on that essay', async ({ page }) => {
    await page.goto('/essays/');

    const firstCard = page.locator('#grid .card').first();
    await expect(firstCard).toBeVisible();

    // Click the title (a small target inside the card's anchor) rather than the
    // full-height card-link: on narrow viewports the link's centre falls behind
    // the sticky header, which would intercept the pointer.
    await firstCard.locator('.card-title').click();
    await page.waitForURL(/\/essays\/.+/);
    // The chosen essay renders its own <h1> (native) or the legacy essay iframe.
    const heading = page.locator('h1').first();
    const frame = page.locator('iframe.essay-frame');
    await expect(heading.or(frame).first()).toBeVisible();
  });
});

test.describe('flow: essay sticky chrome', () => {
  // Every essay page pins the site header and, below it, the essay bar. Both are
  // sticky, and the bar used to sit at top:0 too, so the header (z-index 50)
  // painted straight over it and its back link, crumb, badge and pager were
  // unreachable on every scrolled essay page.
  test('the essay bar stays visible and clickable below the header', async ({ page }) => {
    await page.goto('/essays/venice-sicily/');
    // Scroll far enough that both bars are pinned. Not page.mouse.wheel: mobile
    // WebKit has no wheel. Instant, because global.css scrolls smoothly.
    await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));

    const boxes = async () =>
      page.evaluate(() => {
        const header = document.querySelector('.site-header')!.getBoundingClientRect();
        const bar = document.querySelector('.essay-bar')!.getBoundingClientRect();
        const mid = document.elementFromPoint(bar.left + 60, (bar.top + bar.bottom) / 2);
        return {
          headerBottom: header.bottom,
          barTop: bar.top,
          barHitsBar: !!mid?.closest('.essay-bar'),
        };
      });

    await expect(async () => {
      const { headerBottom, barTop, barHitsBar } = await boxes();
      // Sub-pixel layout rounding, hence the 1px tolerance.
      expect(barTop).toBeGreaterThanOrEqual(headerBottom - 1);
      // Nothing is painted over the bar, so its own controls take the click.
      expect(barHitsBar).toBe(true);
    }).toPass();

    await expect(page.locator('.essay-bar .back')).toBeVisible();
  });
});

test.describe('flow: room-grouped gallery', () => {
  test('groups essay cards under their canonical room headings', async ({ page }) => {
    await page.goto('/essays/');

    const groups = page.locator('[data-room-group]');
    expect(await groups.count()).toBeGreaterThan(0);

    const firstGroup = groups.first();
    await expect(firstGroup.getByRole('heading', { level: 2 })).toBeVisible();
    await expect(firstGroup.locator('.card').first()).toBeVisible();
    await expect(firstGroup.locator('.room-count')).toHaveText(/\d+ essays?/);
  });
});

test.describe('flow: gallery faceted filtering', () => {
  test('an era facet narrows the grid and Reset restores it', async ({ page }) => {
    await page.goto('/essays/');

    const count = page.locator('#count');
    // Filtering runs on load; the live count reads "N of M essays".
    await expect(count).toHaveText(/\d+ of \d+ essays/);
    const initial = (await count.textContent()) ?? '';
    const total = Number(initial.match(/of (\d+) essays/)?.[1] ?? '0');
    expect(total).toBeGreaterThan(0);

    // Pick the first real era option (index 0 is the "All eras" placeholder).
    const era = page.locator('#era');
    const firstEra = await era.locator('option').nth(1).getAttribute('value');
    expect(firstEra, 'gallery should expose at least one era facet').toBeTruthy();
    await era.selectOption(firstEra!);

    // The count reflects the narrowed set (shown ≤ total) and stays well-formed.
    await expect(count).toHaveText(/\d+ of \d+ essays/);
    const shown = Number(((await count.textContent()) ?? '').match(/^(\d+) of/)?.[1] ?? '-1');
    expect(shown).toBeGreaterThanOrEqual(0);
    expect(shown).toBeLessThanOrEqual(total);

    // Reset clears the facet and restores the full set.
    await page.locator('#reset').click();
    await expect(era).toHaveValue('');
    await expect(count).toHaveText(new RegExp(`^${total} of ${total} essays`));
  });
});

test.describe('flow: gallery search', () => {
  test('typing a card title filters the grid to a match', async ({ page }) => {
    await page.goto('/essays/');

    const firstCard = page.locator('#grid .card').first();
    const title = (await firstCard.getAttribute('data-title')) ?? '';
    expect(title.length).toBeGreaterThan(0);
    // A distinctive leading token from the first card's title.
    const token = title.split(/\s+/)[0];

    const search = page.getByRole('searchbox', { name: 'Search essays by title' });
    await search.fill(token);

    // At least the source card stays visible, and the count never exceeds total.
    await expect(page.locator('#count')).toHaveText(/\d+ of \d+ essays/);
    await expect(firstCard).toBeVisible();
  });
});

test.describe('flow: site search', () => {
  // KAN-64: search is mounted in the header, so it has to survive Astro's
  // view-transition swaps. It used to die on the first client-side navigation -
  // the header was replaced by unbound markup and the hoisted script never
  // re-ran - which made the button dead on every page but the entry one.
  test('the header search opens and returns hits after navigating away from home', async ({
    page,
  }) => {
    await page.goto('/');

    const header = page.getByRole('banner');
    await header
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'Rooms' })
      .click();
    await page.waitForURL(/\/rooms\/?$/);

    await header.getByRole('button', { name: 'Search' }).click();
    const dialog = page.getByRole('dialog', { name: 'Site search' });
    await expect(dialog).toBeVisible();

    const results = dialog.locator('[data-ss-results] li');
    await expect(results.first()).toBeVisible();
    await expect(dialog.locator('[data-ss-status]')).toHaveText(/\d+ results?/);

    // Typing narrows the same index rather than starting from an empty state.
    await dialog.getByRole('searchbox', { name: 'Search' }).fill('venice');
    await expect(dialog.locator('[data-ss-status]')).toHaveText(/\d+ results?/);
    await expect(results.first()).toBeVisible();
  });
});

test.describe('flow: atlas context and timeline sync', () => {
  test('essay and time selections stay aligned across map controls and timeline', async ({
    page,
  }) => {
    await page.goto('/atlas/');

    const essay = page.getByRole('combobox', { name: 'Filter by essay' });
    const first = essay.locator('option').nth(1);
    const slug = (await first.getAttribute('value')) ?? '';
    const title = (await first.textContent()) ?? '';
    expect(slug).toBeTruthy();
    await essay.selectOption(slug);

    await expect(page.locator('.am-context-title')).toHaveText(title);
    await expect(page).toHaveURL(new RegExp(`[?&]essay=${slug}(?:&|$)`));
    await expect(page.locator(`[data-atlas-track][data-essay="${slug}"]`)).toHaveClass(
      /is-selected/,
    );

    const year = page.getByRole('slider', { name: 'Reveal through' });
    const minimum = (await year.getAttribute('min')) ?? '-6000';
    await year.fill(minimum);
    await expect(page).toHaveURL(new RegExp(`[?&]year=${minimum}(?:&|$)`));
    await expect(page.locator('[data-atlas-track][data-revealed="false"]').first()).toBeAttached();
  });
});

test.describe('flow: VMN standalone network', () => {
  test('commodity and waypoint interactions highlight authored routes', async ({ page }) => {
    await page.goto('/embeds/vmn-network/');

    await expect(page.locator('[data-edge]')).toHaveCount(38);
    await page.locator('[data-commodity="spices"]').click();
    await expect(page.locator('.vn-status')).toHaveText('3 routes carry spices.');
    await expect(page.locator('[data-edge].is-active').first()).toBeVisible();
    expect(await page.locator('[data-edge].is-dim').count()).toBeGreaterThan(0);

    await page.locator('[data-node="venice"]').focus();
    await expect(page.locator('.vn-status')).toContainText('Venice');
    await expect(page.locator('[data-edge].is-active').first()).toBeVisible();
  });
});

// Held by the staged release gate (KAN-263): invisible-maps-trade carries
// releaseAt '2099-01-01', so /essays/invisible-maps-trade/ is not built and
// these assertions would hit a 404. Re-enable in the same commit that releases
// the essay - `npm run essay:release invisible-maps-trade`.
test.describe.skip('flow: Invisible Maps of Trade publication', () => {
  test('essay interactions and series index are connected', async ({ page }) => {
    await page.goto('/essays/invisible-maps-trade/');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Invisible Maps of Trade' }),
    ).toBeVisible();

    const comparison = page.getByRole('slider', {
      name: 'Reveal slider between Carta Pisana · c. 1290 and Anonymous portolan · c. 1320–50',
    });
    await expect(comparison).toHaveAttribute('aria-valuenow', '50');
    await comparison.focus();
    await page.keyboard.press('ArrowRight');
    await expect(comparison).toHaveAttribute('aria-valuenow', '52');

    await expect(page.locator('[data-vmn-network]')).toBeVisible();
    await page.getByRole('button', { name: /spices/i }).click();
    await expect(page.locator('[data-vmn-network] .vn-status')).toHaveText(
      '3 routes carry spices.',
    );

    await page.getByRole('link', { name: 'Part of the Invisible Maps series' }).click();
    await page.waitForURL(/\/series\/invisible-maps\/?$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Invisible Maps' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Invisible Maps of Trade/i }).first(),
    ).toBeVisible();
  });
});

test.describe('flow: Maps That Age interactive build', () => {
  test('comparison and plate-state filters expose the documented evidence', async ({ page }) => {
    await page.goto('/essays/maps-that-age/');

    await expect(page.getByRole('heading', { level: 1, name: 'Maps That Age' })).toBeVisible();

    const comparison = page.getByRole('slider', {
      name: 'Reveal slider between First plate · 1579 impression and Replacement plate · 1587',
    });
    await comparison.focus();
    await page.keyboard.press('End');
    await expect(comparison).toHaveAttribute('aria-valuenow', '100');

    const explorer = page.locator('[data-plate-state-explorer]');
    await explorer.getByRole('button', { name: 'Plate 2', exact: true }).click();
    await expect(explorer.locator('.pse-status')).toHaveText(
      'Showing 2 documented moments for plate 2.',
    );
    await expect(explorer.locator('[data-state]:visible')).toHaveCount(2);
    await expect(
      explorer.getByRole('link', { name: 'Open catalogue record' }).first(),
    ).toBeVisible();

    await expect(page.locator('[data-cartometry-chart]')).toBeVisible();
    await expect(page.getByRole('link', { name: 'CSV' })).toHaveAttribute(
      'href',
      '/data/cartometry/maps-that-age.csv',
    );
    await expect(
      page.getByRole('navigation', { name: 'Reading path through The Archive' }),
    ).toBeVisible();
  });
});

test.describe('flow: Invisible Maps of Religion interactive build', () => {
  test('grammar filters and comparison remain operable across viewports', async ({ page }) => {
    await page.goto('/essays/invisible-maps-religion/');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Invisible Maps of Religion' }),
    ).toBeVisible();

    const explorer = page.locator('[data-sacred-orientation]');
    await explorer.getByRole('button', { name: 'Pilgrimage route' }).click();
    await expect(explorer.locator('.soe-status')).toHaveText(
      'Showing 1 maps using the route grammar.',
    );
    await expect(explorer.locator('[data-map]:visible')).toHaveCount(1);
    await expect(explorer.getByRole('link', { name: 'Open catalogue record' })).toHaveAttribute(
      'href',
      '/collection/religion-matthew-paris/',
    );

    const comparison = page.getByRole('slider', {
      name: 'Reveal slider between Centred world · Hereford and Sequential route · Matthew Paris',
    });
    await comparison.focus();
    await page.keyboard.press('ArrowRight');
    await expect(comparison).toHaveAttribute('aria-valuenow', '52');

    await expect(
      page.getByRole('navigation', { name: 'Reading path through The Theatre' }),
    ).toBeVisible();
  });
});

test.describe('flow: Cities Remember publication', () => {
  test('fragment evidence and exploratory overlay remain explicit and operable', async ({
    page,
  }) => {
    await page.goto('/essays/cities-remember/');

    await expect(page.getByRole('heading', { level: 1, name: 'Cities Remember' })).toBeVisible();

    const ledger = page.locator('[data-fragment-ledger]');
    await ledger.getByRole('button', { name: 'Proposed location' }).click();
    await expect(ledger.locator('.fl-status')).toHaveText(
      'Showing 2 fragments classified as proposed location.',
    );
    await expect(ledger.locator('[data-fragment]:visible')).toHaveCount(2);

    const comparison = page.getByRole('slider', {
      name: 'Reveal slider between Nuremberg · 1493 civic portrait and Rome · Nolli sheet, 1748',
    });
    await comparison.focus();
    await page.keyboard.press('Home');
    await expect(comparison).toHaveAttribute('aria-valuenow', '0');

    const opacity = page.getByRole('slider', { name: 'Historical layer amount' });
    await opacity.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.cmo-status')).toHaveText('Historical layer at 60% opacity.');
    await expect(
      page.getByRole('link', { name: 'Download the Allmaps-compatible Web Annotation' }),
    ).toHaveAttribute('href', '/annotations/cities-remember-nolli.json');

    await expect(
      page.getByRole('navigation', { name: 'Reading path through The City' }),
    ).toBeVisible();
    const roomPath = page.getByRole('navigation', { name: 'Reading path through The City' });
    await expect(roomPath.getByRole('link', { name: /The City/ })).toHaveAttribute(
      'href',
      '/rooms/city/',
    );
    // Position, not room size: the denominator moves with the staged release
    // schedule (KAN-263) as the rest of The City is published.
    await expect(roomPath).toContainText(/1 of \d+/);

    for (const [name, href] of [
      ['The City', '/rooms/city/'],
      ['The Archive', '/rooms/archive/'],
      ['The Theatre', '/rooms/theatre/'],
    ] as const) {
      await expect(page.getByRole('link', { name, exact: true }).first()).toHaveAttribute(
        'href',
        href,
      );
    }
  });
});
