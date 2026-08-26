import { expect, test } from '@playwright/test';

/**
 * The Nomen Errans vertical slice, checked in an ordinary build (CCD-C2 / KAN-345).
 *
 * The slice is held: it proves the source to citation path closes on one name
 * and stops there, and the trench's map, argument and rights package are still
 * to come. These checks prove the hold is real - that the essay is not served,
 * indexed or linked - and that the Atlas half of the slice survives the hold
 * rather than shipping a dangling return link to a page nobody can load.
 *
 * The page itself is checked in nomen-errans-held-preview.spec.ts, against a
 * build made with SHOW_UNRELEASED=1.
 */
const ESSAY = '/essays/nomen-errans/';

test.describe('the held slice does not leak', () => {
  test('the essay route is not served', async ({ page }) => {
    const response = await page.goto(ESSAY, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(404);
  });

  test('the slice is absent from search and the sitemap', async ({ request }) => {
    const index = JSON.stringify(await (await request.get('/search-index.json')).json());
    expect(index).not.toContain('nomen-errans');
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).not.toContain('nomen-errans');
  });

  test('no released page links into the held essay', async ({ page }) => {
    // The Atlas catalogue lists a layer's essay links, and the Dacia layers now
    // carry one. A held essay's link has to be filtered out server-side, or the
    // hold is only a hold for readers who never open the layer browser.
    await page.goto('/atlas/');
    await expect(page.locator(`a[href*="${ESSAY}"]`)).toHaveCount(0);
  });
});

test.describe('the Atlas half of the slice still works', () => {
  test('a career composition restores its layers with no essay to return to', async ({ page }) => {
    // The composition the Trajanic province opens. It is a real Atlas state
    // whether or not the essay that names it has shipped.
    await page.goto('/atlas/?layers=dacia-roman-network,dacia-roman-sites&year=150');
    await expect(page.locator('[data-active-layer="dacia-roman-sites"]')).toHaveCount(1, {
      timeout: 20_000,
    });
    await expect(page.locator('[data-active-layer="dacia-roman-network"]')).toHaveCount(1);
  });
});
