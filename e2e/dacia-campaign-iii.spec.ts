import { expect, test } from '@playwright/test';

/** KAN-359 release hold: prototype code may ship, the public essay may not. */
test.describe('Dacia Campaign III release hold', () => {
  test('the Borroczyn essay route is not served', async ({ page }) => {
    const response = await page.goto('/essays/borroczyn/', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(404);
  });

  test('the held essay is absent from search and sitemap', async ({ request }) => {
    const index = JSON.stringify(await (await request.get('/search-index.json')).json());
    expect(index.toLowerCase()).not.toContain('borroczyn');
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).not.toContain('/essays/borroczyn/');
  });
});
