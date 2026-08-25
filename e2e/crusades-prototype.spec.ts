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
      'crusades-jerusalem-network',
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

  test('the Holy Land record says why five of six registers are absent', async ({ page }) => {
    await page.goto('/atlas/layers/crusades-jerusalem-network/');
    const body = (await page.locator('#main-content').innerText()).toLowerCase();
    expect(body).toContain('four records out of ten');
    expect(body).toContain('not at 31.78');
  });

  test('the Crusades collection offers no default composition', async ({ page }) => {
    await page.goto('/atlas/?collection=maps-for-a-crusade');
    await expect(page.locator('[data-active-layer]')).toHaveCount(0);
  });
});

test.describe('the Atlas panel makes the same distinctions the essay does', () => {
  /**
   * KAN-387. The layers were registered and the feature panel was generic, so a
   * partition claim and a travelled route arrived on the map looking alike -
   * the one thing the Sea proof exists to prevent. A reader who comes to the
   * Atlas from a search engine rather than through the prose has to be told
   * what the prose tells.
   *
   * Driven by deep link rather than by clicking the canvas: the click path and
   * the link path share `showCrusadesContext`, and only one of them can be
   * asserted without pixel arithmetic over a software-GL map.
   */
  // The partition claim itself cannot be deep-linked: it has no geometry and is
  // on no layer, which is the point. The diversion is the nearest state that
  // reaches the map, and it has to arrive saying what kind of claim it is.
  test('a deep-linked state says what kind of claim it is', async ({ page }) => {
    await page.goto(
      '/atlas/?layers=crusades-fourth-crusade-events&collection=maps-for-a-crusade' +
        '&feature=cru-fcs-zara',
    );
    await expect(page.locator('[data-active-layer="crusades-fourth-crusade-events"]')).toHaveCount(
      1,
      { timeout: 20_000 },
    );
    const context = page.locator('.am-context');
    await expect(context).toContainText('negotiated diversion', { timeout: 20_000 });
    await expect(context).toContainText('A change of terms');
    // Nothing on this map may read as settled evidence.
    await expect(context).toContainText('unreviewed');
    await expect(context).toContainText('folio not transcribed');
  });

  test('a deep-linked Holy Land port says its position is borrowed', async ({ page }) => {
    await page.goto(
      '/atlas/?layers=crusades-jerusalem-network&collection=maps-for-a-crusade' +
        '&feature=cru-jer-acre-capital',
    );
    await expect(page.locator('[data-active-layer="crusades-jerusalem-network"]')).toHaveCount(1, {
      timeout: 20_000,
    });
    const context = page.locator('.am-context');
    await expect(context).toContainText('network node', { timeout: 20_000 });
    await expect(context).toContainText('modern reference');
    await expect(context).toContainText('unreviewed');
  });
});
