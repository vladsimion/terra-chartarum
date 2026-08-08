import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ESSAY = '/essays/the-league-that-left-no-map/';

test.describe('Hanseatic essay production release (KAN-315)', () => {
  test('publishes the native essay, sections, interactives and catalogue witnesses', async ({
    page,
  }) => {
    await page.goto(ESSAY);

    await expect(page.locator('iframe.essay-frame')).toHaveCount(0);
    await expect(page.locator('article.native-essay')).toBeVisible();
    await expect(page.locator('section.essay-section')).toHaveCount(9);
    await expect(page.locator('[data-hse-reveal]')).toHaveCount(1);
    await expect(page.locator('[data-hse-commodity]')).toHaveCount(1);
    await expect(page.locator('[data-hse-timeline]')).toHaveCount(1);
    await expect(page.locator('[data-hse-witnesses]')).toHaveCount(1);
    await expect(page.locator('[data-hse-compare]')).toHaveCount(1);
    const witnessHrefs = await page
      .locator('[data-hse-witnesses] a[href^="/collection/hse-"]')
      .evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).pathname));
    expect(new Set(witnessHrefs).size).toBe(8);
  });

  test('supports keyboard interaction and reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ESSAY);

    const network = page.getByRole('button', { name: 'Analytical network' });
    await network.focus();
    await page.keyboard.press('Enter');
    await expect(network).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-reveal-panel="network"]')).toBeVisible();

    const territory = page.getByRole('tab', { name: 'Territory' });
    await territory.focus();
    await page.keyboard.press('ArrowRight');
    const routes = page.getByRole('tab', { name: 'Routes' });
    await expect(routes).toBeFocused();
    await expect(routes).toHaveAttribute('aria-selected', 'true');

    const salt = page.locator('[data-commodity="hse-commodity-salt"]');
    await salt.focus();
    await page.keyboard.press('Space');
    await expect(salt).toHaveAttribute('aria-pressed', 'true');
  });

  test('passes axe WCAG A/AA in both witness and network views', async ({ page }) => {
    await page.goto(ESSAY);
    for (const view of ['Historical witness', 'Analytical network']) {
      await page.getByRole('button', { name: view }).click();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(results.violations, `${view}: ${JSON.stringify(results.violations, null, 2)}`).toEqual(
        [],
      );
    }
  });

  test('resolves every internal essay link', async ({ page }) => {
    await page.goto(ESSAY);
    const hrefs = await page.locator('article.native-essay a[href^="/"]').evaluateAll((links) =>
      Array.from(
        new Set(
          links.map((link) => {
            const url = new URL((link as HTMLAnchorElement).href);
            return `${url.pathname}${url.search}`;
          }),
        ),
      ),
    );

    expect(hrefs.length).toBeGreaterThanOrEqual(20);
    for (const href of hrefs) {
      const response = await page.request.get(href);
      expect(response.status(), href).toBeLessThan(400);
    }
  });

  test('records desktop and mobile release scrubs', async ({ page }, testInfo) => {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'mobile', width: 390, height: 844 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`${ESSAY}#four-cities-inside-other-cities`);
      await expect(page.locator('[data-hse-witnesses]')).toBeVisible();
      await testInfo.attach(`hanseatic-${viewport.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
    }
  });
});
