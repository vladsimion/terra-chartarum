import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Every portal route type, one representative each (KAN-52 widened the axe pass
// from the KAN-176 core set to the whole surface: static pages, both index
// listings, both detail templates, and a legacy essay host).
// `heading: true` routes render their own <h1> in the portal DOM. Legacy essays
// host their <h1> inside an isolated iframe, so the wrapper has none of its own —
// its title lives in the essay-bar breadcrumb instead.
const ROUTES = [
  { path: '/', name: 'home', heading: true },
  { path: '/essays/', name: 'essays gallery', heading: true },
  { path: '/atlas/', name: 'atlas', heading: true },
  { path: '/collection/', name: 'collection', heading: true },
  { path: '/collection/babylonian/', name: 'collection detail', heading: true },
  { path: '/cartographers/', name: 'cartographers', heading: true },
  { path: '/cartographers/mercator/', name: 'cartographer detail', heading: true },
  { path: '/about/', name: 'about', heading: true },
  { path: '/colophon/', name: 'colophon', heading: true },
  { path: '/bibliography/', name: 'bibliography', heading: true },
  { path: '/essays/cartography/', name: 'legacy essay', heading: false },
];

test.describe('smoke: core routes render', () => {
  for (const { path, name, heading } of ROUTES) {
    test(`${name} (${path}) loads with shared chrome`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status(), `HTTP status for ${path}`).toBeLessThan(400);
      // Shared portal chrome is present on every route.
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('contentinfo')).toBeVisible();
      if (heading) {
        await expect(page.locator('h1').first()).toBeVisible();
      } else {
        // Legacy essay: iframe interior carries the heading.
        await expect(page.locator('iframe.essay-frame')).toBeVisible();
      }
    });
  }
});

test.describe('a11y: axe is clean (zero WCAG A/AA violations)', () => {
  for (const { path, name } of ROUTES) {
    test(`${name} (${path}) passes axe WCAG A/AA`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // Legacy essays render inside an isolated iframe; the portal wrapper is
        // what this ticket scopes, so exclude iframe internals from the budget.
        .exclude('iframe')
        .analyze();
      expect(
        results.violations,
        results.violations
          .map(
            (v) => `[${v.impact}] ${v.id}: ${v.help} — ${v.nodes.map((n) => n.target).join('; ')}`,
          )
          .join('\n'),
      ).toEqual([]);
    });
  }
});

test.describe('a11y: keyboard & focus management', () => {
  test('skip link is the first tab stop and jumps to main content', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.locator('a.skip-link');
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await expect(skip).toHaveAttribute('href', '#main-content');
    await skip.press('Enter');
    // Activating it moves focus to the programmatic main target.
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('focus resets to main content after a view-transition navigation', async ({ page }) => {
    await page.goto('/essays/');
    // Client-side navigate by clicking an in-page link (triggers Astro's swap).
    await page.locator('main a[href^="/essays/"]').first().click();
    await page.waitForURL(/\/essays\/.+/);
    // The after-swap handler should have parked focus on the new page's main.
    await expect(page.locator('#main-content')).toBeFocused();
  });
});
