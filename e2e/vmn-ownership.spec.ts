import { expect, test } from '@playwright/test';

/**
 * VMN ownership model (ATLAS-1223 / KAN-434).
 *
 * The Atlas used to carry a hard-coded CTA above the map sending readers to
 * `/embeds/vmn-network/`. It explained nothing about what VMN was or why one
 * programme was promoted at the top level, and it existed because the essay
 * that owns the explorer is held.
 *
 * The rule these checks defend: the essay interprets, the Atlas spatialises,
 * the Handbook documents. A held essay is not a reason to grow a bespoke
 * entry point, and it is not a reason to leak the essay either.
 */
test.describe('the Atlas promotes no single programme', () => {
  test('the VMN embed CTA is gone from above the map', async ({ page }) => {
    await page.goto('/atlas/');
    const main = page.locator('#main-content');
    await expect(main).not.toContainText('Explore the VMN route and commodity network');
    await expect(main.locator('a[href="/embeds/vmn-network/"]')).toHaveCount(0);
  });

  test('VMN is still discoverable through its collection and layers', async ({ page }) => {
    for (const layer of ['venetian-ports', 'venetian-routes', 'venetian-possessions']) {
      const response = await page.goto(`/atlas/layers/${layer}/`, {
        waitUntil: 'domcontentloaded',
      });
      expect(response?.status(), layer).toBe(200);
    }
  });

  test('the standalone embed remains reachable for direct linking', async ({ page }) => {
    // Secondary surface, not primary navigation. Removing the CTA must not have
    // removed the route.
    const response = await page.goto('/embeds/vmn-network/', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
  });
});

/*
 * This block used to assert the opposite: that no surface named Invisible Maps of
 * Trade "while it is held". The embargo lapsed. The essay carries
 * `releaseAt: '2026-10-01'` in its frontmatter, so from 1 October 2026 the site's
 * own release gate (src/lib/release.ts) began building and listing it, and the
 * assertions started failing on every pull request - correctly, in the sense that
 * the site had changed and the test had not. Nothing on main runs this suite on a
 * schedule, so it went unnoticed for seven weeks.
 *
 * Turned around rather than deleted. The surfaces worth watching are the same two;
 * what changed is which way they should answer. An embargo that has expired is
 * still worth a test, because silently dropping an essay from the catalogue after
 * release would be as much a defect as leaking it before.
 */
test.describe('the released essay is present across the Atlas surfaces', () => {
  test('VMN surfaces name Invisible Maps of Trade now that it is released', async ({
    page,
    request,
  }) => {
    await page.goto('/atlas/');
    await expect(page.locator('#main-content')).toContainText('Invisible Maps of Trade');

    const index = await (await request.get('/search-index.json')).json();
    const haystack = JSON.stringify(index).toLowerCase();
    expect(haystack).toContain('invisible-maps-trade');
  });
});
