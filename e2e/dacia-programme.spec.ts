import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Programme index (KAN-370). The page is generated from the governance tables,
// so what needs a browser is the contract around it: that every trench is
// discoverable whether or not it has been written, that the shared datasets
// read as programme infrastructure and their links resolve, and that Terra
// Sigillata is presented as the cycle's index without being extended.
const INDEX = '/programmes/corpus-chartarum-daciae/';

test.describe('Corpus Chartarum Daciae programme index', () => {
  test('all seven trenches are discoverable with status and room', async ({ page }) => {
    await page.goto(INDEX);

    const trenches = page.locator('.trench');
    await expect(trenches).toHaveCount(7);

    // Unfinished work is discoverable too: the planned trenches are on the page
    // and legible, not hidden until they ship.
    await expect(page.locator('.trench[data-state="planned"]').first()).toBeVisible();
    await expect(trenches.filter({ hasText: 'In Manibvs' })).toHaveCount(1);
    await expect(trenches.filter({ hasText: 'Dacia Rediviva' })).toHaveCount(1);

    // Each card states its gates rather than only its successes.
    await expect(trenches.first()).toContainText('Gates passed');
    await expect(trenches.first()).toContainText('Open debts');
  });

  test('the shared datasets link into the Atlas and the corpus', async ({ page }) => {
    await page.goto(INDEX);

    const datasets = page.locator('.dataset');
    await expect(datasets).toHaveCount(6);
    await expect(page.locator('a[href^="/atlas?layers=dacia-"]')).not.toHaveCount(0);

    // Every internal target the page offers resolves rather than 404s.
    const internal = await page
      .locator('main a[href^="/"]')
      .evaluateAll((links) => [
        ...new Set(links.map((link) => link.getAttribute('href') as string)),
      ]);
    expect(internal.length).toBeGreaterThan(2);
    for (const href of internal) {
      const response = await page.request.get(href);
      expect(response.status(), `${href} should resolve`).toBeLessThan(400);
    }
  });

  test('Terra Sigillata is the index, reached from the programme and back', async ({ page }) => {
    await page.goto(INDEX);
    const section = page.locator('section[aria-labelledby="index-essay"]');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toContainText('intellectual index');

    await section.locator('a[href="/essays/dacia/"]').click();
    await expect(page).toHaveURL(/\/essays\/dacia\//);

    // And the essay points back, which is how the index is discoverable at all.
    await expect(page.locator(`a[href="${INDEX}"]`)).not.toHaveCount(0);
  });

  test('has no accessibility violations', async ({ page }) => {
    await page.goto(INDEX);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
