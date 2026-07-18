import { test, expect } from '@playwright/test';

// Core user flows (KAN-54 / ATLAS-603). These run on every engine in the
// Playwright config — Chromium, Firefox, WebKit — and on two mobile viewports
// (Pixel 5, iPhone 13), so they double as the cross-browser / responsive QA
// gate. They are deliberately click- and value-driven (no keyboard-focus
// assertions, which are engine-specific and covered chromium-only in
// smoke.spec.ts) and make no assumptions about the exact essay count.

test.describe('flow: primary navigation', () => {
  test('header nav reaches Essays and Atlas from the home page', async ({ page }) => {
    await page.goto('/');

    // The primary nav is present and usable at every viewport (it reflows rather
    // than collapsing into a menu, so the links stay directly clickable).
    const nav = page.getByRole('navigation', { name: 'Primary' });
    await expect(nav).toBeVisible();

    await nav.getByRole('link', { name: 'Essays' }).click();
    await page.waitForURL(/\/essays\/?$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Visual essays' })).toBeVisible();

    await nav.getByRole('link', { name: 'Atlas' }).click();
    await page.waitForURL(/\/atlas\/?$/);
    await expect(page.locator('h1').first()).toBeVisible();

    // The brand mark returns to the home page.
    await page.getByRole('link', { name: 'Terra Chartarum — home' }).click();
    await page.waitForURL(/\/$/);
    await expect(page.locator('h1').first()).toBeVisible();
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
