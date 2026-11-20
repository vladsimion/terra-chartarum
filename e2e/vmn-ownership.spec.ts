import { expect, test } from '@playwright/test';

import { partitionEssays } from '../scripts/lib/essay-release.mjs';

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

/*
 * The complementary half, and the half that went missing. The block above was
 * turned around when `invisible-maps-trade` released on 1 October 2026 (#202),
 * which was right for that essay - but it left the rule it had been defending
 * untested: a held essay must not leak through the Atlas.
 *
 * Restored here without a name in it. The held set is read from the same
 * frontmatter the build gates on, so the suite arms and disarms itself and
 * cannot expire the way the assertion above did. That also gave it teeth: ten
 * essays are held today rather than the one that used to be named, and checking
 * all ten found the Crusades collection shipping under a held essay's title.
 */
test.describe('no held essay leaks through the Atlas', () => {
  const held = partitionEssays().held;

  test.skip(held.length === 0, 'the release gate is holding nothing in this build');

  test('the Atlas page names none of them', async ({ page }) => {
    await page.goto('/atlas/');
    const main = page.locator('#main-content');
    for (const essay of held) {
      await expect(main, `${essay.slug}, held until ${essay.releaseAt}`).not.toContainText(
        essay.title,
      );
    }
  });

  test('the search index carries none of them', async ({ request }) => {
    const index: { type: string; id: string; url: string; title: string }[] = await (
      await request.get('/search-index.json')
    ).json();
    expect(index.length).toBeGreaterThan(0);

    for (const essay of held) {
      const where = `${essay.slug}, held until ${essay.releaseAt}`;
      // Matched on the fields a leak would actually travel in, rather than a
      // substring of the whole document: a collection or layer may legitimately
      // share a slug with a held essay without naming it (`terra-incognita`
      // does), and a blanket search cannot tell those apart.
      expect(
        index.filter((entry) => entry.url === `/essays/${essay.slug}/`),
        where,
      ).toEqual([]);
      expect(
        index.filter((entry) => entry.type === 'essay' && entry.id === essay.slug),
        where,
      ).toEqual([]);
      expect(
        index.filter((entry) => entry.title === essay.title),
        where,
      ).toEqual([]);
    }
  });
});
