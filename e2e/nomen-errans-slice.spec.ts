import { expect, test } from '@playwright/test';

/**
 * Nomen Errans release and discovery checks (CCD-C4 / KAN-347).
 *
 * The detailed interaction and accessibility contract remains in
 * nomen-errans-held-preview.spec.ts; that suite also works against the released
 * page. These checks hold the production-only boundary: route, discovery and
 * the Atlas return leg must all become public together.
 */
const ESSAY = '/essays/nomen-errans/';

test.describe('the essay is released', () => {
  test('the essay route is served', async ({ page }) => {
    const response = await page.goto(ESSAY, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toContainText('Nomen Errans');
  });

  test('the essay is present in search and the sitemap', async ({ request }) => {
    const index = JSON.stringify(await (await request.get('/search-index.json')).json());
    expect(index).toContain('nomen-errans');
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).toContain('nomen-errans');
  });

  test('the Atlas return leg points into the released careers passage', async ({ page }) => {
    await page.goto(
      '/atlas/?layers=dacia-roman-network,dacia-roman-sites&year=150&essay=nomen-errans',
    );
    await expect(page.locator('[data-active-layer="dacia-roman-sites"]')).toHaveCount(1, {
      timeout: 20_000,
    });
    await expect(page.locator('.am-context-link')).toHaveAttribute('href', `${ESSAY}#careers`);
  });
});

test.describe('the Atlas composition still works', () => {
  test('a career composition restores its layers', async ({ page }) => {
    await page.goto('/atlas/?layers=dacia-roman-network,dacia-roman-sites&year=150');
    await expect(page.locator('[data-active-layer="dacia-roman-sites"]')).toHaveCount(1, {
      timeout: 20_000,
    });
    await expect(page.locator('[data-active-layer="dacia-roman-network"]')).toHaveCount(1);
  });
});
