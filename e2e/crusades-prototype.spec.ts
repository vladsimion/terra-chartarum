import { expect, test } from '@playwright/test';

/**
 * Crusades prototype QA (CRU-6 / KAN-389).
 *
 * The prototype essay is held: no folio has been transcribed and no witness is
 * cleared. These checks prove the hold is real in the built site, and that the
 * Atlas half carries the two distinctions the proofs exist to protect.
 */

test.describe('the held prototype does not leak', () => {
  test('the essay route is not served', async ({ page }) => {
    const response = await page.goto('/essays/maps-for-a-crusade/', {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status()).toBe(404);
  });

  test('the prototype is absent from search and sitemap', async ({ request }) => {
    const index = JSON.stringify(await (await request.get('/search-index.json')).json());
    expect(index.toLowerCase()).not.toContain('maps-for-a-crusade');
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).not.toContain('maps-for-a-crusade');
  });
});

test.describe('the Atlas half keeps the two distinctions', () => {
  test('every Crusades layer has a public record', async ({ page }) => {
    for (const layer of [
      'crusades-itinerary',
      'crusades-fourth-crusade-routes',
      'crusades-fourth-crusade-events',
    ]) {
      const response = await page.goto(`/atlas/layers/${layer}/`, {
        waitUntil: 'domcontentloaded',
      });
      expect(response?.status(), layer).toBe(200);
      await expect(page.locator('h1').first()).toBeVisible();
    }
  });

  test('the itinerary record says the positions are not the manuscript s', async ({ page }) => {
    await page.goto('/atlas/layers/crusades-itinerary/');
    const body = (await page.locator('#main-content').innerText()).toLowerCase();
    expect(body).toContain('not the manuscript');
    expect(body).toContain('no coordinates');
  });

  test('the route record explains what is deliberately not drawn', async ({ page }) => {
    await page.goto('/atlas/layers/crusades-fourth-crusade-routes/');
    const body = (await page.locator('#main-content').innerText()).toLowerCase();
    expect(body).toContain('partition');
    expect(body).toContain('publish a claim as a map');
  });

  test('the Crusades collection offers no default composition', async ({ page }) => {
    await page.goto('/atlas/?collection=maps-for-a-crusade');
    await expect(page.locator('[data-active-layer]')).toHaveCount(0);
  });
});
