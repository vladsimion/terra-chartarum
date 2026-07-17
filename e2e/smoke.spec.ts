import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Core routes that must render and stay accessible. Kept small and representative
// (home, gallery, atlas, a legacy essay, collection) rather than exhaustive.
// `heading: true` routes render their own <h1> in the portal DOM. Legacy essays
// host their <h1> inside an isolated iframe, so the wrapper has none of its own —
// its title lives in the essay-bar breadcrumb instead.
const ROUTES = [
  { path: '/', name: 'home', heading: true },
  { path: '/essays/', name: 'essays gallery', heading: true },
  { path: '/atlas/', name: 'atlas', heading: true },
  { path: '/essays/cartography/', name: 'legacy essay', heading: false },
  { path: '/collection/', name: 'collection', heading: true },
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

test.describe('a11y: axe budget (zero serious/critical violations)', () => {
  for (const { path, name } of ROUTES) {
    test(`${name} (${path}) passes axe WCAG A/AA`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // Legacy essays render inside an isolated iframe; the portal wrapper is
        // what this ticket scopes, so exclude iframe internals from the budget.
        .exclude('iframe')
        .analyze();
      const seriousOrWorse = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(seriousOrWorse, seriousOrWorse.map((v) => `${v.id}: ${v.help}`).join('\n')).toEqual(
        [],
      );
    });
  }
});
