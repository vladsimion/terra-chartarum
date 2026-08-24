import { expect, test } from '@playwright/test';

/**
 * TERRA INCOGNITA release QA (ANT-13 / KAN-432).
 *
 * The essay is held: nothing in its evidence base has been read against a
 * source. These checks prove the hold is real in the built site rather than
 * only in the frontmatter, and that the Atlas half - which does ship - carries
 * its documentation and its warnings.
 */

test.describe('the held essay does not leak', () => {
  test('the essay route is not served', async ({ page }) => {
    const response = await page.goto('/essays/terra-incognita/', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(404);
  });

  test('the essay is absent from the search index', async ({ request }) => {
    const index = await (await request.get('/search-index.json')).json();
    const entries = Array.isArray(index) ? index : (index.entries ?? index.records ?? []);
    const haystack = JSON.stringify(entries).toLowerCase();
    expect(haystack).not.toContain('terra-incognita');
    expect(haystack).not.toContain('the continent before it was seen');
  });

  test('the essay is absent from the sitemap', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).not.toContain('terra-incognita');
  });
});

test.describe('the Atlas half ships with its warnings intact', () => {
  test('every Antarctic layer has a public record', async ({ page }) => {
    for (const layer of [
      'antarctica-conjectured-south',
      'antarctica-expedition-tracks',
      'antarctica-observations',
      'antarctica-ghost-geographies',
    ]) {
      const response = await page.goto(`/atlas/layers/${layer}/`, {
        waitUntil: 'domcontentloaded',
      });
      expect(response?.status(), layer).toBe(200);
      await expect(page.locator('h1').first()).toBeVisible();
    }
  });

  test('the conjectured layer says its outline is not a coastline', async ({ page }) => {
    await page.goto('/atlas/layers/antarctica-conjectured-south/');
    const body = (await page.locator('#main-content').innerText()).toLowerCase();
    expect(body).toContain('not a coastline');
    expect(body).toContain('in review');
  });

  test('the empty ghost layer explains why it is empty', async ({ page }) => {
    await page.goto('/atlas/layers/antarctica-ghost-geographies/');
    const body = (await page.locator('#main-content').innerText()).toLowerCase();
    // A layer that ships empty owes the reader the reason, or it reads as broken.
    expect(body).toContain('empty');
    expect(body).toContain('located');
  });

  test('no Antarctic layer page needs GitHub to explain its claim', async ({ page }) => {
    await page.goto('/atlas/layers/antarctica-observations/');
    // Technical links are allowed in their own section; the prose must not need them.
    const prose = await page.locator('#main-content p').allInnerTexts();
    for (const paragraph of prose) expect(paragraph).not.toContain('github.com');
  });

  test('the Antarctic collection offers no default composition', async ({ page }) => {
    await page.goto('/atlas/?collection=terra-incognita');
    // Nothing here has been reviewed, so opening the collection must not put
    // uncleared material on the map. Base context layers are a different thing
    // and are allowed to be on: the assertion is about this collection's own
    // members, not about the map being blank.
    //
    // This used to read `[data-active-layer]` with an expected count of zero,
    // at a time when no element carried that attribute - so it matched nothing
    // whatever the map was showing. AtlasMap now stamps the ID on each active
    // layer chip, which is what gives the check something to be wrong about.
    await page.waitForFunction(() => document.querySelector('[data-active-layers]') !== null);
    const active = await page
      .locator('[data-active-layer]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-active-layer') ?? ''));
    expect(active.filter((id) => id.startsWith('antarctica-'))).toEqual([]);
  });
});
